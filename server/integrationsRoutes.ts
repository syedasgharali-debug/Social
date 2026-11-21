import express from 'express';
import crypto from 'crypto';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import net from 'net';

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'trashmail.com',
  'throwawaymail.com',
  'sharklasers.com',
  'getnada.com',
  'dispostable.com',
  'fakeinbox.com',
  'maildrop.cc',
]);

function isPrivateIpAddress(ip: string): boolean {
  const clean = ip.replace(/^::ffff:/i, '').toLowerCase();
  if (net.isIPv4(clean)) {
    const parts = clean.split('.').map(Number);
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true;
    return false;
  }
  if (net.isIPv6(clean)) {
    if (clean === '::1' || clean === '::') return true;
    if (clean.startsWith('fc') || clean.startsWith('fd')) return true; // ULA fc00::/7
    if (clean.startsWith('fe8') || clean.startsWith('fe9') || clean.startsWith('fea') || clean.startsWith('feb')) {
      return true; // Link-local fe80::/10
    }
    return false;
  }
  return true;
}

export async function validateSafePublicHttpUrl(rawUrl: string): Promise<{ ok: boolean; url?: URL; error?: string }> {
  try {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) return { ok: false, error: 'URL is required.' };
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, error: 'Only public http:// and https:// URLs are permitted.' };
    }
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      !host ||
      host === 'localhost' ||
      host === 'metadata.google.internal' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.localhost')
    ) {
      return { ok: false, error: 'Private, loopback, or local-network hostnames are blocked.' };
    }
    if (net.isIP(host)) {
      if (isPrivateIpAddress(host)) {
        return { ok: false, error: 'Private or loopback IP addresses are blocked.' };
      }
      return { ok: true, url: parsed };
    }
    const resolved = await dns.promises.lookup(host, { all: true }).catch(() => null);
    if (!resolved || resolved.length === 0) {
      return { ok: false, error: `Could not resolve hostname "${host}". Verify the URL and DNS.` };
    }
    for (const addr of resolved) {
      if (isPrivateIpAddress(addr.address)) {
        return { ok: false, error: 'Target hostname resolves to a restricted internal network address.' };
      }
    }
    return { ok: true, url: parsed };
  } catch {
    return { ok: false, error: 'Malformed URL. Include a valid public domain.' };
  }
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code) || 32));
}

export interface PersistedCampaignStore {
  entries: Array<{
    id: string;
    campaignId: string;
    workspaceId: string;
    name: string;
    email: string;
    handle: string;
    platform: string;
    referralCode: string;
    referredBy?: string;
    entriesPoints: number;
    ipFingerprint: string;
    fraudStatus: 'verified' | 'flagged_duplicate' | 'flagged_bot';
    verificationHash: string;
    submittedAt: string;
  }>;
  pixelEvents: Array<{
    id: string;
    pixelId: string;
    campaignId?: string;
    workspaceId?: string;
    eventType: 'pageview' | 'signup' | 'purchase';
    revenueUsd: number;
    email?: string;
    referralCode?: string;
    url?: string;
    ipFingerprint: string;
    recordedAt: string;
  }>;
}

export function createIntegrationsRouter(dataDir: string) {
  const router = express.Router();
  const eventsFile = path.join(dataDir, 'campaign-events.json');
  let memoryStore: PersistedCampaignStore | null = null;

  const loadStore = (): PersistedCampaignStore => {
    if (memoryStore) return memoryStore;
    try {
      if (fs.existsSync(eventsFile)) {
        const parsed = JSON.parse(fs.readFileSync(eventsFile, 'utf8')) as PersistedCampaignStore;
        if (parsed && Array.isArray(parsed.entries) && Array.isArray(parsed.pixelEvents)) {
          memoryStore = parsed;
          return memoryStore;
        }
      }
    } catch {
      // fall through
    }
    memoryStore = { entries: [], pixelEvents: [] };
    return memoryStore;
  };

  const saveStore = (store: PersistedCampaignStore) => {
    memoryStore = store;
    try {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(eventsFile, JSON.stringify(store, null, 2), 'utf8');
    } catch {
      // keep in memory if read-only container
    }
  };

  // 1. Live RSS / Atom / YouTube Feed Sync (with strict SSRF protection)
  router.post('/feeds/sync', async (req, res) => {
    try {
      const { feedUrl, keywordFilter, sourceName, sourceType } = req.body || {};
      const check = await validateSafePublicHttpUrl(String(feedUrl || ''));
      if (!check.ok || !check.url) {
        return res.status(400).json({ error: check.error || 'Enter a valid public RSS/Atom URL.' });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      let xml = '';
      try {
        const response = await fetch(check.url.toString(), {
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SocialifyAIBot/1.0; +https://www.socialifyai.com)',
            Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
          },
        });
        if (!response.ok) {
          return res.status(422).json({ error: `Feed returned HTTP ${response.status}. Verify the feed URL.` });
        }
        xml = (await response.text()).slice(0, 400_000);
      } catch (err) {
        const isTimeout = err instanceof Error && err.name === 'AbortError';
        return res.status(isTimeout ? 504 : 422).json({
          error: isTimeout ? 'Timed out fetching feed URL.' : 'Could not reach the feed URL.',
        });
      } finally {
        clearTimeout(timeout);
      }

      const items: { title: string; summary: string; url: string; publishedAt: string }[] = [];
      const rssBlocks = Array.from(xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi));
      const atomBlocks = rssBlocks.length === 0 ? Array.from(xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)) : [];
      const blocks = rssBlocks.length > 0 ? rssBlocks : atomBlocks;

      for (const match of blocks.slice(0, 25)) {
        const block = match[1];
        const titleRaw = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
        const linkHref =
          block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ||
          block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ||
          '';
        const descRaw =
          block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ||
          block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ||
          block.match(/<media:description[^>]*>([\s\S]*?)<\/media:description>/i)?.[1] ||
          '';
        const dateRaw =
          block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ||
          block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1] ||
          block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1] ||
          '';

        const cleanTitle = decodeXmlEntities(
          titleRaw.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim()
        );
        const cleanUrl = linkHref.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const cleanSummary = decodeXmlEntities(
          descRaw.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        ).slice(0, 300);

        let parsedDate = new Date().toISOString();
        if (dateRaw) {
          const d = new Date(dateRaw.trim());
          if (!Number.isNaN(d.getTime())) parsedDate = d.toISOString();
        }

        if (cleanTitle && cleanUrl.startsWith('http')) {
          items.push({
            title: cleanTitle,
            summary: cleanSummary || `Latest item from ${sourceName || check.url.hostname}.`,
            url: cleanUrl,
            publishedAt: parsedDate,
          });
        }
      }

      const filterTokens = String(keywordFilter || '')
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      const filtered =
        filterTokens.length > 0
          ? items.filter((it) => {
              const hay = `${it.title} ${it.summary}`.toLowerCase();
              return filterTokens.some((tok) => hay.includes(tok));
            })
          : items;

      return res.json({
        fetchedAt: new Date().toISOString(),
        sourceName: sourceName || check.url.hostname,
        sourceType: sourceType || 'rss',
        totalParsed: items.length,
        items: filtered.slice(0, 15),
      });
    } catch (error) {
      console.error('feeds/sync error:', error);
      return res.status(500).json({ error: 'Feed synchronization failed.' });
    }
  });

  // 2. Real CMS REST & Signed Webhook Publisher (WordPress, Webflow, Shopify, Ghost, Custom Webhook)
  router.post('/cms/publish', async (req, res) => {
    try {
      const { provider, endpointUrl, article, authCredential, webhookSecret } = req.body || {};
      const prov = String(provider || 'webhook').toLowerCase();
      const check = await validateSafePublicHttpUrl(String(endpointUrl || ''));
      if (!check.ok || !check.url) {
        return res.status(400).json({ error: check.error || 'Provide a valid public http(s) CMS endpoint URL.' });
      }
      if (!article || typeof article !== 'object') {
        return res.status(400).json({ error: 'Article payload is required.' });
      }

      const publishedAt = new Date().toISOString();
      const art = article as {
        title?: string;
        slug?: string;
        metaTitle?: string;
        metaDescription?: string;
        h1?: string;
        sections?: Array<{ heading: string; level: string; body: string }>;
        schemaFaq?: Array<{ question: string; answer: string }>;
      };

      const htmlBody = (art.sections || [])
        .map((s) => `<${s.level === 'h3' ? 'h3' : 'h2'}>${s.heading}</${s.level === 'h3' ? 'h3' : 'h2'}><p>${s.body}</p>`)
        .join('\n');

      let targetUrl = check.url.toString();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'SocialifyAI-CMS/2.0',
      };
      let payloadBody: Record<string, unknown> = {
        event: 'seo_article.published',
        publishedAt,
        article: art,
      };

      const cred = String(authCredential || '').trim();
      if (prov === 'wordpress') {
        if (!targetUrl.includes('/wp-json/')) {
          targetUrl = `${targetUrl.replace(/\/+$/, '')}/wp-json/wp/v2/posts`;
        }
        if (cred) {
          headers.Authorization = cred.includes(':')
            ? `Basic ${Buffer.from(cred).toString('base64')}`
            : `Bearer ${cred}`;
        }
        payloadBody = {
          title: art.title || art.h1 || 'Untitled Post',
          slug: art.slug,
          content: htmlBody,
          excerpt: art.metaDescription || '',
          status: 'publish',
        };
      } else if (prov === 'webflow') {
        if (cred) headers.Authorization = `Bearer ${cred}`;
        payloadBody = {
          isArchived: false,
          isDraft: false,
          fieldData: {
            name: art.title || art.h1 || 'Untitled Post',
            slug: art.slug,
            'post-body': htmlBody,
            'meta-description': art.metaDescription || '',
          },
        };
      } else if (prov === 'shopify') {
        if (cred) headers['X-Shopify-Access-Token'] = cred;
        payloadBody = {
          article: {
            title: art.title || art.h1 || 'Untitled Post',
            body_html: htmlBody,
            summary_html: art.metaDescription || '',
            published: true,
          },
        };
      } else if (prov === 'ghost') {
        if (cred) headers.Authorization = `Ghost ${cred}`;
        payloadBody = {
          posts: [
            {
              title: art.title || art.h1 || 'Untitled Post',
              slug: art.slug,
              html: htmlBody,
              meta_title: art.metaTitle || art.title,
              meta_description: art.metaDescription || '',
              status: 'published',
            },
          ],
        };
      }

      const serialized = JSON.stringify(payloadBody);
      const signingKey = String(webhookSecret || process.env.CMS_WEBHOOK_SIGNING_SECRET || 'socialifyai-webhook-v2');
      const signature = crypto.createHmac('sha256', signingKey).update(serialized).digest('hex');
      headers['X-Socialify-Signature'] = `sha256=${signature}`;
      headers['X-Socialify-Timestamp'] = publishedAt;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          signal: controller.signal,
          headers,
          body: serialized,
        });
        const respText = await response.text().catch(() => '');
        let respJson: Record<string, unknown> = {};
        try {
          respJson = JSON.parse(respText);
        } catch {
          // Non-JSON response
        }

        if (!response.ok) {
          const remoteMessage =
            typeof respJson.message === 'string'
              ? respJson.message
              : typeof respJson.error === 'string'
                ? respJson.error
                : response.statusText || 'Remote CMS error';
          return res.status(502).json({
            ok: false,
            error: `${prov.toUpperCase()} endpoint responded HTTP ${response.status}: ${remoteMessage}`,
            httpStatus: response.status,
            endpoint: targetUrl,
          });
        }

        const publishedUrl =
          (typeof respJson.link === 'string' && respJson.link) ||
          (typeof respJson.url === 'string' && respJson.url) ||
          (typeof (respJson.article as { url?: string })?.url === 'string' && (respJson.article as { url?: string }).url) ||
          targetUrl;

        return res.json({
          ok: true,
          dispatched: true,
          httpStatus: response.status,
          publishedAt,
          publishedUrl,
          endpoint: targetUrl,
          signatureHeader: `sha256=${signature.slice(0, 16)}...`,
        });
      } catch (err) {
        const isTimeout = err instanceof Error && err.name === 'AbortError';
        return res.status(isTimeout ? 504 : 502).json({
          ok: false,
          error: isTimeout
            ? `CMS endpoint timed out after 8s (${targetUrl}).`
            : `Could not reach ${targetUrl}. Check DNS, TLS certificate, and firewall rules.`,
          endpoint: targetUrl,
        });
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      console.error('cms/publish error:', error);
      return res.status(500).json({ error: 'CMS publish request failed.' });
    }
  });

  // 3. Public Viral Campaign Entry Endpoint (fraud check, referral code, SHA-256 receipt)
  router.post('/campaigns/enter', (req, res) => {
    try {
      const {
        campaignId,
        workspaceId,
        slug,
        name,
        email,
        handle,
        platform,
        referredBy,
        bonusPoints,
        utmSource,
        utmCampaign,
      } = req.body || {};

      const cleanName = String(name || '').trim().slice(0, 120);
      const cleanEmail = String(email || '').trim().toLowerCase().slice(0, 254);
      const cleanCampaignId = String(campaignId || '').trim().slice(0, 128);

      if (!cleanCampaignId) {
        return res.status(400).json({ error: 'campaignId is required.' });
      }
      if (cleanName.length < 2) {
        return res.status(400).json({ error: 'Enter your name (at least 2 characters).' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
      }

      const domain = cleanEmail.split('@')[1] || '';
      const isDisposable = DISPOSABLE_DOMAINS.has(domain);

      const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
        .split(',')[0]
        .trim();
      const ipFingerprint = `fp-${crypto.createHash('sha256').update(`${clientIp}|${req.headers['user-agent'] || ''}`).digest('hex').slice(0, 10)}`;

      const store = loadStore();
      const campaignEntries = store.entries.filter((e) => e.campaignId === cleanCampaignId);
      const isDuplicateEmail = campaignEntries.some((e) => e.email === cleanEmail);
      const sameIpCount = campaignEntries.filter((e) => e.ipFingerprint === ipFingerprint).length;

      const fraudStatus: 'verified' | 'flagged_duplicate' | 'flagged_bot' = isDisposable || sameIpCount >= 4
        ? 'flagged_bot'
        : isDuplicateEmail
          ? 'flagged_duplicate'
          : 'verified';

      const refPrefix = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'fan';
      const referralCode = `${refPrefix}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const submittedAt = new Date().toISOString();
      const entryId = `ent-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const verificationHash = crypto
        .createHash('sha256')
        .update(`${cleanCampaignId}|${entryId}|${cleanEmail}|${submittedAt}`)
        .digest('hex')
        .slice(0, 16)
        .toUpperCase();

      const validReferrer =
        typeof referredBy === 'string' && referredBy.trim()
          ? campaignEntries.find((e) => e.referralCode.toLowerCase() === referredBy.trim().toLowerCase())
          : undefined;

      const entryRecord = {
        id: entryId,
        campaignId: cleanCampaignId,
        workspaceId: String(workspaceId || 'ws-main').slice(0, 128),
        name: cleanName,
        email: cleanEmail,
        handle: String(handle || `@${refPrefix}`).trim().slice(0, 80),
        platform: String(platform || 'instagram').slice(0, 32),
        referralCode,
        referredBy: validReferrer?.referralCode,
        entriesPoints: Math.max(1, Number(bonusPoints) || 1),
        ipFingerprint,
        fraudStatus,
        verificationHash,
        submittedAt,
      };

      store.entries.unshift(entryRecord);
      store.entries = store.entries.slice(0, 2000);
      saveStore(store);

      const safeSlug = String(slug || cleanCampaignId).replace(/[^a-zA-Z0-9_-]/g, '');
      const referralLink = `https://www.socialifyai.com/c/${safeSlug}?ref=${referralCode}&utm_source=${encodeURIComponent(
        String(utmSource || 'socialify_viral')
      )}&utm_medium=referral&utm_campaign=${encodeURIComponent(String(utmCampaign || safeSlug))}`;

      return res.status(fraudStatus === 'verified' ? 201 : 200).json({
        ok: true,
        entry: entryRecord,
        referralCode,
        referralLink,
        referrerMatched: Boolean(validReferrer),
        blockedReason: isDisposable
          ? 'Disposable email domain flagged by Fraud Guard.'
          : isDuplicateEmail
            ? 'Duplicate email submission flagged by Fraud Guard.'
            : undefined,
      });
    } catch (error) {
      console.error('campaigns/enter error:', error);
      return res.status(500).json({ error: 'Could not record campaign entry.' });
    }
  });

  // 4. Public Conversion Tracking Pixel Ingestion
  router.post('/pixel/event', (req, res) => {
    try {
      const { pixelId, campaignId, workspaceId, eventType, revenueUsd, email, referralCode, url } = req.body || {};
      const cleanPixelId = String(pixelId || '').trim().slice(0, 64);
      if (!cleanPixelId) {
        return res.status(400).json({ error: 'pixelId is required.' });
      }
      const allowedTypes = new Set(['pageview', 'signup', 'purchase']);
      const cleanEventType = allowedTypes.has(String(eventType))
        ? (String(eventType) as 'pageview' | 'signup' | 'purchase')
        : 'signup';
      const cleanRevenue = Math.max(0, Number(revenueUsd) || 0);

      const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
        .split(',')[0]
        .trim();
      const ipFingerprint = `fp-${crypto.createHash('sha256').update(clientIp).digest('hex').slice(0, 10)}`;

      const store = loadStore();
      const eventRecord = {
        id: `pxe-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        pixelId: cleanPixelId,
        campaignId: campaignId ? String(campaignId).slice(0, 128) : undefined,
        workspaceId: workspaceId ? String(workspaceId).slice(0, 128) : undefined,
        eventType: cleanEventType,
        revenueUsd: cleanRevenue,
        email: email ? String(email).trim().toLowerCase().slice(0, 254) : undefined,
        referralCode: referralCode ? String(referralCode).trim().slice(0, 64) : undefined,
        url: url ? String(url).slice(0, 500) : undefined,
        ipFingerprint,
        recordedAt: new Date().toISOString(),
      };

      store.pixelEvents.unshift(eventRecord);
      store.pixelEvents = store.pixelEvents.slice(0, 5000);
      saveStore(store);

      const matching = store.pixelEvents.filter((ev) => ev.pixelId === cleanPixelId);
      const totalAttributedRevenueUsd = matching.reduce((s, ev) => s + ev.revenueUsd, 0);

      return res.status(201).json({
        ok: true,
        event: eventRecord,
        pixelSummary: {
          pixelId: cleanPixelId,
          totalEvents: matching.length,
          signups: matching.filter((e) => e.eventType === 'signup').length,
          purchases: matching.filter((e) => e.eventType === 'purchase').length,
          totalAttributedRevenueUsd,
        },
      });
    } catch (error) {
      console.error('pixel/event error:', error);
      return res.status(500).json({ error: 'Could not ingest pixel event.' });
    }
  });

  router.get('/pixel/events/:pixelId', (req, res) => {
    const cleanPixelId = String(req.params.pixelId || '').trim().slice(0, 64);
    const store = loadStore();
    const events = store.pixelEvents.filter((e) => e.pixelId === cleanPixelId).slice(0, 100);
    return res.json({
      pixelId: cleanPixelId,
      totalEvents: events.length,
      totalAttributedRevenueUsd: events.reduce((s, e) => s + e.revenueUsd, 0),
      events,
    });
  });

  return router;
}
