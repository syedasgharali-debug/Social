import React, { useState, useMemo } from 'react';
import {
  Youtube,
  Plus,
  Sparkles,
  FileText,
  Image as ImageIcon,
  ListVideo,
  Copy,
  Check,
  Trash2,
  Calendar,
  Send,
  Download,
  Monitor,
  Smartphone,
  Play,
  Loader2,
  X,
  Clock,
  FolderPlus,
} from 'lucide-react';
import {
  YouTubeChannel,
  YouTubeVideoItem,
  Platform,
  SocialPost,
} from '../../types';
import { aiService } from '../../services/aiService';
import {
  KpiMetricCard,
  StatusBadge,
  EmptyStatePanel,
} from '../common/DesignPrimitives';

interface YouTubeStudioProps {
  workspaceId: string;
  workspaceName: string;
  workspaceIndustry: string;
  channels: YouTubeChannel[];
  videos: YouTubeVideoItem[];
  maxChannelsQuota: number;
  aiCreditsRemaining: number;
  onConsumeCredits: (amount: number, reason: string) => boolean;
  onOpenSettings?: () => void;
  onAddChannel: (channel: YouTubeChannel) => void;
  onUpdateChannel: (channel: YouTubeChannel) => void;
  onDeleteChannel: (id: string) => void;
  onAddVideo: (video: YouTubeVideoItem) => void;
  onUpdateVideo: (video: YouTubeVideoItem) => void;
  onDeleteVideo: (id: string) => void;
  onScheduleSocialPosts: (posts: SocialPost[], navigateToScheduler?: boolean) => void;
  onToast: (title: string, description?: string, variant?: 'info' | 'success' | 'warning') => void;
}

type StudioSubTab = 'pipeline' | 'thumbnails' | 'queue';
type PreviewDevice = 'desktop' | 'mobile' | 'shorts';

const THUMBNAIL_ACCENTS: Record<
  YouTubeVideoItem['thumbnailAccent'],
  { label: string; border: string; badge: string; stroke: string; textClass: string }
> = {
  cyan: { label: 'Cyan', border: 'border-l-[#06B6D4]', badge: '#06B6D4', stroke: '#22D3EE', textClass: 'text-[#22D3EE]' },
  orange: { label: 'Orange', border: 'border-l-[#F97316]', badge: '#F97316', stroke: '#FB923C', textClass: 'text-[#FB923C]' },
  indigo: { label: 'Slate', border: 'border-l-[#9CA3AF]', badge: '#9CA3AF', stroke: '#D1D5DB', textClass: 'text-[#D1D5DB]' },
  emerald: { label: 'Emerald', border: 'border-l-[#10B981]', badge: '#10B981', stroke: '#34D399', textClass: 'text-[#34D399]' },
};

export function YouTubeStudio({
  workspaceId,
  workspaceName,
  workspaceIndustry,
  channels,
  videos,
  maxChannelsQuota,
  aiCreditsRemaining,
  onConsumeCredits,
  onOpenSettings,
  onAddChannel,
  onUpdateChannel,
  onDeleteChannel,
  onAddVideo,
  onUpdateVideo,
  onDeleteVideo,
  onScheduleSocialPosts,
  onToast,
}: YouTubeStudioProps) {
  const wsChannels = useMemo(
    () => channels.filter((c) => c.workspaceId === workspaceId),
    [channels, workspaceId]
  );
  const wsVideos = useMemo(
    () => videos.filter((v) => v.workspaceId === workspaceId),
    [videos, workspaceId]
  );

  const [activeChannelId, setActiveChannelId] = useState<string>(() => wsChannels[0]?.id || '');
  const activeChannel = useMemo(
    () => wsChannels.find((c) => c.id === activeChannelId) || wsChannels[0] || null,
    [wsChannels, activeChannelId]
  );

  const channelVideos = useMemo(
    () => (activeChannel ? wsVideos.filter((v) => v.channelId === activeChannel.id) : wsVideos),
    [wsVideos, activeChannel]
  );

  const [subTab, setSubTab] = useState<StudioSubTab>('pipeline');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [channelForm, setChannelForm] = useState({
    channelName: '',
    handle: '@',
    niche: workspaceIndustry || 'SaaS & Creator Growth',
    defaultPlaylist: 'Core Tutorials',
    subscribers: '0',
    watchHours30d: '0',
    dailyUploadQuotaLimit: '6',
  });

  // Ideation & Pipeline State
  const [ideaKeyword, setIdeaKeyword] = useState('');
  const [ideaFormat, setIdeaFormat] = useState<'long_form' | 'short'>('long_form');
  const [ideas, setIdeas] = useState<
    { topic: string; format: 'long_form' | 'short'; hookAngle: string; searchIntent: string; thumbnailHeadline: string }[]
  >([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);

  const [pipelineTopic, setPipelineTopic] = useState('');
  const [pipelineFormat, setPipelineFormat] = useState<'long_form' | 'short'>('long_form');
  const [pipelineTone, setPipelineTone] = useState('High-Retention & Practical');
  const [generatingPipeline, setGeneratingPipeline] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string>('');

  const activeVideo = useMemo(
    () => channelVideos.find((v) => v.id === activeVideoId) || channelVideos[0] || null,
    [channelVideos, activeVideoId]
  );

  // Thumbnail A/B Preview
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [abVariantIndex, setAbVariantIndex] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Bulk Queue Controls
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [bulkStartDate, setBulkStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [bulkCadenceDays, setBulkCadenceDays] = useState(2);

  const copyText = (key: string, value: string, label: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
    onToast('Copied to Clipboard', label, 'info');
  };

  const handleConnectChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelForm.channelName.trim()) return;
    if (wsChannels.length >= maxChannelsQuota) {
      onToast(
        'Channel Quota Reached',
        `Your plan allows up to ${maxChannelsQuota} connected YouTube channels per workspace.`,
        'warning'
      );
      return;
    }
    const cleanName = channelForm.channelName.trim();
    const cleanHandle = channelForm.handle.trim().startsWith('@')
      ? channelForm.handle.trim()
      : `@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const defaultPl = channelForm.defaultPlaylist.trim() || 'Core Uploads';
    const created: YouTubeChannel = {
      id: `ytc-${Date.now()}`,
      workspaceId,
      channelName: cleanName,
      handle: cleanHandle,
      channelId: `UC${Math.random().toString(36).slice(2, 14).toUpperCase()}`,
      niche: channelForm.niche.trim() || workspaceIndustry,
      subscribers: Math.max(0, Number(channelForm.subscribers) || 0),
      watchHours30d: Math.max(0, Number(channelForm.watchHours30d) || 0),
      dailyUploadQuotaUsed: 0,
      dailyUploadQuotaLimit: Math.max(1, Number(channelForm.dailyUploadQuotaLimit) || 6),
      defaultPlaylist: defaultPl,
      playlists: [defaultPl, 'YouTube Shorts', 'Evergreen Deep Dives'],
      status: 'connected',
      createdAt: new Date().toISOString(),
    };
    onAddChannel(created);
    setActiveChannelId(created.id);
    setShowConnectModal(false);
    setChannelForm({
      channelName: '',
      handle: '@',
      niche: workspaceIndustry || 'SaaS & Creator Growth',
      defaultPlaylist: 'Core Tutorials',
      subscribers: '0',
      watchHours30d: '0',
      dailyUploadQuotaLimit: '6',
    });
    onToast('YouTube Channel Connected', `${created.channelName} (${created.handle}) is now active in ${workspaceName}.`, 'success');
  };

  const handleGenerateIdeas = async () => {
    const query = ideaKeyword.trim() || activeChannel?.niche || workspaceIndustry;
    if (!query) {
      onToast('Enter a Niche Keyword', 'Specify a topic or niche to generate YouTube concepts.', 'warning');
      return;
    }
    if (aiCreditsRemaining < 15) {
      onToast(
        'AI Credit Limit Reached',
        `YouTube ideation requires 15 credits (${aiCreditsRemaining} remaining). Upgrade plan in Settings.`,
        'warning'
      );
      return;
    }

    setLoadingIdeas(true);
    try {
      const res = await aiService.generateYouTubeIdeation({
        niche: query,
        format: ideaFormat,
        channelName: activeChannel?.channelName || workspaceName,
      });
      onConsumeCredits(15, 'YouTube Topic Ideation');
      setIdeas(res.ideas || []);
      onToast('Concepts Generated', `Created ${res.ideas?.length || 0} YouTube ideas (-15 AI credits).`, 'success');
    } catch (err) {
      onToast('Ideation Failed', err instanceof Error ? err.message : 'Unable to generate ideas.', 'warning');
    } finally {
      setLoadingIdeas(false);
    }
  };

  const handleGeneratePipeline = async (overrideTopic?: string, overrideFormat?: 'long_form' | 'short') => {
    const topicToUse = (overrideTopic ?? pipelineTopic).trim();
    const formatToUse = overrideFormat ?? pipelineFormat;
    if (!activeChannel) {
      onToast('Connect a Channel First', 'Add a YouTube channel before creating a video pipeline.', 'warning');
      setShowConnectModal(true);
      return;
    }
    if (!topicToUse) {
      onToast('Topic Required', 'Enter a video topic or select one from Topic Ideation.', 'warning');
      return;
    }
    if (aiCreditsRemaining < 40) {
      onToast(
        'AI Credit Limit Reached',
        `Script-to-Metadata pipeline requires 40 credits (${aiCreditsRemaining} remaining). Upgrade plan in Settings.`,
        'warning'
      );
      return;
    }

    setGeneratingPipeline(true);
    try {
      const data = await aiService.generateYouTubePipeline({
        niche: activeChannel.niche,
        topic: topicToUse,
        format: formatToUse,
        tone: pipelineTone,
        channelName: activeChannel.channelName,
      });

      onConsumeCredits(40, 'YouTube Script & Metadata Pipeline');
      const newVideo: YouTubeVideoItem = {
        id: `ytv-${Date.now()}`,
        workspaceId,
        channelId: activeChannel.id,
        format: formatToUse,
        topic: topicToUse,
        seoTitles: data.seoTitles?.length ? data.seoTitles : [topicToUse],
        selectedTitle: data.seoTitles?.[0] || topicToUse,
        description: data.description || '',
        script: data.script || { hook: '', body: '', cta: '' },
        chapters: data.chapters || [],
        tags: data.tags || [],
        pinnedComment: data.pinnedComment || '',
        thumbnailPrompt: data.thumbnailPrompt || '',
        thumbnailHeadline: data.thumbnailHeadline || topicToUse.split(' ').slice(0, 3).join(' ').toUpperCase(),
        thumbnailAccent: formatToUse === 'short' ? 'orange' : 'cyan',
        playlist: formatToUse === 'short' ? 'YouTube Shorts' : activeChannel.defaultPlaylist,
        status: 'scripted',
        crossPostedPlatforms: [],
        createdAt: new Date().toISOString(),
      };
      onAddVideo(newVideo);
      setActiveVideoId(newVideo.id);
      setAbVariantIndex(0);
      setPipelineTopic('');
      onToast('Video Pipeline Ready', `Script, chapters, SEO titles & thumbnail brief created (-40 AI credits).`, 'success');
    } catch (err) {
      onToast('Generation Failed', err instanceof Error ? err.message : 'Unable to generate script.', 'warning');
    } finally {
      setGeneratingPipeline(false);
    }
  };

  const handleCrossPostVideo = (video: YouTubeVideoItem, platforms: Platform[]) => {
    const baseDate = video.scheduledAt ? new Date(video.scheduledAt) : new Date(Date.now() + 86400000);
    const createdPosts: SocialPost[] = platforms.map((platform, idx) => {
      const dt = new Date(baseDate.getTime() + idx * 3600 * 1000 * 3);
      const copy =
        platform === 'x'
          ? `${video.selectedTitle}\n\n${video.script.hook.slice(0, 175)}\n\nWatch full ${video.format === 'short' ? 'Short' : 'breakdown'} on ${activeChannel?.handle || 'YouTube'}.`
          : platform === 'linkedin'
          ? `${video.selectedTitle}\n\nKey breakdown from our latest YouTube release:\n${video.chapters
              .slice(0, 4)
              .map((c) => `• ${c.timestamp} — ${c.label}`)
              .join('\n')}\n\n${video.script.cta}`
          : `${video.selectedTitle}\n\n${video.script.hook}\n\n${video.pinnedComment}`;

      return {
        id: `p-yt-${Date.now()}-${idx}`,
        workspaceId,
        platforms: [platform],
        content: copy,
        firstComment: video.tags.slice(0, 4).map((t) => `#${t.replace(/\s+/g, '')}`).join(' '),
        status: 'scheduled',
        isEvergreen: true,
        scheduledAt: dt.toISOString(),
      };
    });

    onScheduleSocialPosts(createdPosts, true);
    onUpdateVideo({
      ...video,
      crossPostedPlatforms: Array.from(new Set([...(video.crossPostedPlatforms || []), ...platforms])),
    });
    onToast(
      'Cross-Posted to Scheduler',
      `Pushed ${createdPosts.length} video promo snippets (X, LinkedIn, Instagram Reels) to Visual Scheduler.`,
      'success'
    );
  };

  const buildYoutubeCalendarPost = (video: YouTubeVideoItem, scheduledIso: string, suffix: string): SocialPost => ({
    id: `p-yt-drop-${Date.now()}-${suffix}`,
    workspaceId,
    platforms: ['youtube'],
    content: `[YouTube ${video.format === 'short' ? 'Short' : 'Video'} · ${video.playlist}] ${video.selectedTitle}\n\n${video.script.hook || video.description}`,
    firstComment: video.pinnedComment || video.tags.slice(0, 5).map((t) => `#${t.replace(/\s+/g, '')}`).join(' '),
    status: 'scheduled',
    isEvergreen: false,
    scheduledAt: scheduledIso,
  });

  const handleScheduleSingleVideo = (video: YouTubeVideoItem) => {
    const dropDate = video.scheduledAt
      ? new Date(video.scheduledAt)
      : new Date(`${bulkStartDate}T14:00:00`);
    const iso = dropDate.toISOString();
    onUpdateVideo({
      ...video,
      status: 'scheduled',
      scheduledAt: iso,
    });
    onScheduleSocialPosts([buildYoutubeCalendarPost(video, iso, 'single')], false);
    if (activeChannel) {
      onUpdateChannel({
        ...activeChannel,
        dailyUploadQuotaUsed: Math.min(
          activeChannel.dailyUploadQuotaLimit,
          activeChannel.dailyUploadQuotaUsed + 1
        ),
      });
    }
    onToast(
      'Scheduled to YouTube & Visual Calendar',
      `"${video.selectedTitle}" scheduled for ${dropDate.toLocaleDateString()} and synced to Visual Scheduler.`,
      'success'
    );
  };

  const handleBulkScheduleQueue = () => {
    const unscheduled = channelVideos.filter((v) => v.status === 'scripted' || v.status === 'idea' || v.status === 'queued');
    if (unscheduled.length === 0) {
      onToast('No Unscheduled Videos', 'All videos for this channel are already scheduled or published.', 'info');
      return;
    }
    const start = new Date(`${bulkStartDate}T14:00:00`);
    const calendarPosts: SocialPost[] = [];
    unscheduled.forEach((video, idx) => {
      const dropDate = new Date(start.getTime() + idx * bulkCadenceDays * 86400000);
      const iso = dropDate.toISOString();
      onUpdateVideo({
        ...video,
        status: 'scheduled',
        scheduledAt: iso,
      });
      calendarPosts.push(buildYoutubeCalendarPost(video, iso, String(idx)));
    });
    onScheduleSocialPosts(calendarPosts, false);
    if (activeChannel) {
      onUpdateChannel({
        ...activeChannel,
        dailyUploadQuotaUsed: Math.min(
          activeChannel.dailyUploadQuotaLimit,
          activeChannel.dailyUploadQuotaUsed + unscheduled.length
        ),
      });
    }
    onToast(
      'Bulk Drop Scheduled & Synced',
      `Scheduled ${unscheduled.length} YouTube video(s) every ${bulkCadenceDays} day(s) starting ${bulkStartDate} in both YouTube Queue and Visual Scheduler.`,
      'success'
    );
  };

  const handleCopyAllPackage = (video: YouTubeVideoItem) => {
    const fullPkg = [
      `SELECTED SEO TITLE:\n${video.selectedTitle}`,
      video.seoTitles.length > 1
        ? `\nALTERNATE SEO TITLES:\n${video.seoTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
        : '',
      video.description ? `\nDESCRIPTION:\n${video.description}` : '',
      `\nSCRIPT — HOOK (0–15s):\n${video.script.hook}`,
      `\nSCRIPT — BODY:\n${video.script.body}`,
      `\nSCRIPT — CTA:\n${video.script.cta}`,
      video.chapters.length
        ? `\nTIMESTAMPS / CHAPTERS:\n${video.chapters.map((c) => `${c.timestamp} ${c.label}`).join('\n')}`
        : '',
      video.tags.length ? `\nSEO TAGS:\n${video.tags.join(', ')}` : '',
      video.pinnedComment ? `\nPINNED FIRST COMMENT:\n${video.pinnedComment}` : '',
      video.thumbnailPrompt ? `\nTHUMBNAIL DIRECTION:\n${video.thumbnailPrompt}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    copyText('all-pkg', fullPkg, 'Complete YouTube Script & SEO Metadata Package');
  };

  const handleAddPlaylist = () => {
    if (!activeChannel || !newPlaylistName.trim()) return;
    if (activeChannel.playlists.includes(newPlaylistName.trim())) return;
    onUpdateChannel({
      ...activeChannel,
      playlists: [...activeChannel.playlists, newPlaylistName.trim()],
    });
    setNewPlaylistName('');
    onToast('Playlist Added', `"${newPlaylistName.trim()}" added to ${activeChannel.channelName}.`, 'success');
  };

  const handleExportThumbnailSvg = (video: YouTubeVideoItem) => {
    const accent = THUMBNAIL_ACCENTS[video.thumbnailAccent] || THUMBNAIL_ACCENTS.cyan;
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#090A0D"/>
  <rect x="48" y="48" width="1184" height="624" rx="16" fill="#13161D" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
  <rect x="48" y="48" width="10" height="624" rx="4" fill="${accent.badge}"/>
  <text x="110" y="165" fill="${accent.stroke}" font-family="Inter, sans-serif" font-size="28" font-weight="600">${esc(activeChannel?.handle || workspaceName)}</text>
  <text x="110" y="340" fill="#F3F4F6" font-family="Inter, sans-serif" font-size="84" font-weight="700">${esc(video.thumbnailHeadline.slice(0, 26))}</text>
  <text x="110" y="430" fill="#9CA3AF" font-family="Inter, sans-serif" font-size="32" font-weight="400">${esc(video.selectedTitle.slice(0, 62))}</text>
  <rect x="110" y="510" width="280" height="60" rx="8" fill="${accent.badge}"/>
  <text x="148" y="550" fill="#090A0D" font-family="Inter, sans-serif" font-size="24" font-weight="700">${video.format === 'short' ? 'YOUTUBE SHORT' : 'FULL BREAKDOWN'}</text>
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video.selectedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-thumbnail.svg`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Thumbnail Exported', 'Downloaded 1280×720 thumbnail asset (SVG).', 'success');
  };

  const handleExportQueueCsv = () => {
    const rows = [
      ['Title', 'Format', 'Channel', 'Playlist', 'Status', 'Scheduled At', 'Tags'].join(','),
      ...channelVideos.map((v) =>
        [
          `"${v.selectedTitle.replace(/"/g, '""')}"`,
          v.format,
          `"${activeChannel?.channelName || ''}"`,
          `"${v.playlist}"`,
          v.status,
          v.scheduledAt || '',
          `"${v.tags.join('; ')}"`,
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-queue-${workspaceId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('CSV Exported', `Exported ${channelVideos.length} YouTube video items.`, 'success');
  };

  const handleUploadThumbnailImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeVideo) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateVideo({ ...activeVideo, thumbnailUrl: reader.result });
        onToast('Thumbnail Image Attached', file.name, 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const totalSubscribers = wsChannels.reduce((s, c) => s + c.subscribers, 0);
  const totalWatchHours = wsChannels.reduce((s, c) => s + c.watchHours30d, 0);
  const scheduledCount = wsVideos.filter((v) => v.status === 'scheduled' || v.status === 'published').length;

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#F8F9FB] dark:bg-[#090A0D] custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#06B6D4]">
              Multi-Channel Video Studio · {workspaceName}
            </p>
            <h1 className="text-xl font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.02em] mt-1">
              AI YouTube Studio
            </h1>
            <p className="text-[13px] text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
              Manage Long-Form &amp; Shorts channels, draft retention scripts and SEO metadata, A/B test thumbnails, and cross-post snippets.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-[12px] text-[#4B5563] dark:text-[#9CA3AF] font-mono tabular-nums mr-1">
              {wsChannels.length}/{maxChannelsQuota} channels · {aiCreditsRemaining.toLocaleString()} credits
            </span>
            <button
              onClick={() => setShowConnectModal(true)}
              className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md text-[12px] font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <Plus size={14} strokeWidth={1.5} /> Connect Channel
            </button>
          </div>
        </div>

        {/* Non-Blocking Plan Quota & AI Credit Banner */}
        {(wsChannels.length >= maxChannelsQuota || aiCreditsRemaining < 40) && (
          <div className="bg-orange-500/[0.06] dark:bg-orange-500/[0.08] border border-orange-500/30 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[12px]">
            <p className="text-[#111827] dark:text-[#F3F4F6] font-medium">
              {wsChannels.length >= maxChannelsQuota
                ? `Channel quota reached (${wsChannels.length}/${maxChannelsQuota} YouTube channels on your current plan).`
                : `Low AI credit balance (${aiCreditsRemaining} remaining — Script Pipeline needs 40 credits).`}
            </p>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="px-3 py-1 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-md font-medium whitespace-nowrap transition-colors"
              >
                Manage Plan &amp; Quotas
              </button>
            )}
          </div>
        )}

        {/* Real Aggregated KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiMetricCard
            label="Total Subscribers"
            value={totalSubscribers.toLocaleString()}
            subtext={`Across ${wsChannels.length} channels`}
          />
          <KpiMetricCard
            label="Watch Time (30d)"
            value={`${totalWatchHours.toLocaleString()}h`}
            subtext="Reported channel hours"
          />
          <KpiMetricCard
            label="Video Pipelines"
            value={wsVideos.length}
            subtext="Long-Form & Shorts"
            accent="cyan"
          />
          <KpiMetricCard
            label="Scheduled Drops"
            value={scheduledCount}
            subtext="Active playlist queue"
            accent="default"
          />
        </div>

        {/* Connected Multi-Channel Switcher Strip */}
        <div className="bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
              Connected Channels
            </h2>
            <span className="text-[11px] font-mono text-[#6B7280] tabular-nums">
              {wsChannels.length} connected
            </span>
          </div>

          {wsChannels.length === 0 ? (
            <EmptyStatePanel
              icon={<Youtube size={22} strokeWidth={1.5} />}
              title="No YouTube channels connected yet"
              description="Connect your first channel to unlock multi-channel playlists, daily upload quotas, and AI script pipelines."
              actionLabel="Connect First Channel"
              onAction={() => setShowConnectModal(true)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {wsChannels.map((ch) => {
                const isActive = activeChannel?.id === ch.id;
                const quotaPct = Math.min(100, Math.round((ch.dailyUploadQuotaUsed / Math.max(1, ch.dailyUploadQuotaLimit)) * 100));
                return (
                  <div
                    key={ch.id}
                    onClick={() => {
                      setActiveChannelId(ch.id);
                      setActiveVideoId('');
                      setAbVariantIndex(0);
                    }}
                    className={`p-3.5 rounded-md border cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[#F8F9FB] dark:bg-[#191D26] border-[#06B6D4]'
                        : 'bg-[#F8F9FB] dark:bg-[#0E1015] border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6] truncate">
                          {ch.channelName}
                        </p>
                        <p className="text-[11px] font-mono text-[#6B7280] truncate">
                          {ch.handle} · {ch.niche}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeChannel?.id === ch.id) {
                            setActiveChannelId('');
                            setActiveVideoId('');
                          }
                          onDeleteChannel(ch.id);
                        }}
                        title="Disconnect channel"
                        className="p-1 text-[#6B7280] hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={13} strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono tabular-nums text-[#4B5563] dark:text-[#9CA3AF]">
                      <span>{ch.subscribers.toLocaleString()} subs</span>
                      <span>{ch.watchHours30d.toLocaleString()}h (30d)</span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#6B7280] tabular-nums mb-1">
                        <span>DAILY UPLOAD QUOTA</span>
                        <span>
                          {ch.dailyUploadQuotaUsed}/{ch.dailyUploadQuotaLimit}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#E5E7EB] dark:bg-white/[0.08] overflow-hidden">
                        <div
                          className="h-full bg-[#06B6D4] rounded-full transition-all"
                          style={{ width: `${quotaPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Channel Telemetry & Default Playlist Bar */}
          {activeChannel && (
            <div className="mt-3 pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-[12px]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#4B5563] dark:text-[#9CA3AF] tabular-nums">
                <span className="font-semibold text-[#111827] dark:text-[#F3F4F6]">
                  Active: {activeChannel.channelName}
                </span>
                <span className="font-mono">{activeChannel.subscribers.toLocaleString()} subs</span>
                <span className="font-mono">{activeChannel.watchHours30d.toLocaleString()}h watch (30d)</span>
                <span className="font-mono text-[#06B6D4]">
                  Quota {activeChannel.dailyUploadQuotaUsed}/{activeChannel.dailyUploadQuotaLimit}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-[#6B7280] font-mono uppercase">Default Playlist:</span>
                <select
                  aria-label="Active channel default playlist"
                  value={activeChannel.defaultPlaylist}
                  onChange={(e) =>
                    onUpdateChannel({ ...activeChannel, defaultPlaylist: e.target.value })
                  }
                  className="px-2.5 py-1 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                >
                  {activeChannel.playlists.map((pl) => (
                    <option key={pl} value={pl}>
                      {pl}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Sub-Navigation Segmented Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-3">
          <div className="flex items-center gap-1 p-0.5 bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md">
            {[
              { id: 'pipeline' as const, label: 'Ideation & Script Pipeline', icon: FileText },
              { id: 'thumbnails' as const, label: 'Thumbnail Studio & A/B', icon: ImageIcon },
              { id: 'queue' as const, label: 'Bulk Queue & Playlists', icon: ListVideo },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setSubTab(t.id)}
                  className={`px-3 py-1.5 rounded text-[12px] font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    subTab === t.id
                      ? 'bg-white dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.08]'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] border border-transparent'
                  }`}
                >
                  <Icon size={13} strokeWidth={1.5} /> {t.label}
                </button>
              );
            })}
          </div>

          {channelVideos.length > 0 && (
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-[#6B7280] font-mono text-[11px] uppercase">Video:</span>
              <select
                value={activeVideo?.id || ''}
                onChange={(e) => {
                  setActiveVideoId(e.target.value);
                  setAbVariantIndex(0);
                }}
                className="px-3 py-1.5 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none max-w-xs focus:border-[#06B6D4]"
              >
                {channelVideos.map((v) => (
                  <option key={v.id} value={v.id}>
                    [{v.format === 'short' ? 'Short' : 'Video'}] {v.selectedTitle}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* SUB-TAB 1: IDEATION & SCRIPT-TO-METADATA PIPELINE */}
        {subTab === 'pipeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Ideation + Pipeline Generator */}
            <div className="lg:col-span-5 space-y-4">
              {/* Topic & Trend Generator */}
              <div className="bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-5 space-y-3.5">
                <div>
                  <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                    AI Topic &amp; Trend Ideation
                  </h3>
                  <p className="text-[12px] text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
                    Generate high-CTR Long-Form and Shorts concepts (15 credits).
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    value={ideaKeyword}
                    onChange={(e) => setIdeaKeyword(e.target.value)}
                    placeholder={activeChannel?.niche || 'e.g. AI automation for agencies'}
                    className="flex-1 px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[12px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                  <select
                    value={ideaFormat}
                    onChange={(e) => setIdeaFormat(e.target.value as 'long_form' | 'short')}
                    className="px-2.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  >
                    <option value="long_form">Long-Form</option>
                    <option value="short">Shorts</option>
                  </select>
                </div>
                <button
                  disabled={loadingIdeas}
                  onClick={handleGenerateIdeas}
                  className="w-full py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md text-[12px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-60 transition-colors"
                >
                  {loadingIdeas ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} strokeWidth={1.5} className="text-[#06B6D4]" />}
                  {loadingIdeas ? 'Generating Concepts...' : 'Generate 5 Video Concepts'}
                </button>

                {ideas.length > 0 && (
                  <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] pt-1">
                    {ideas.map((idea, idx) => (
                      <div key={idx} className="py-2.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6]">{idea.topic}</p>
                          <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
                            {idea.format === 'short' ? 'Short' : 'Long-Form'} · {idea.searchIntent} · Hook: {idea.hookAngle}
                          </p>
                        </div>
                        <button
                          disabled={generatingPipeline}
                          onClick={() => handleGeneratePipeline(idea.topic, idea.format)}
                          className="px-2.5 py-1 border border-[#E5E7EB] dark:border-white/[0.12] hover:border-[#06B6D4] text-[#111827] dark:text-[#F3F4F6] rounded text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors"
                        >
                          Build Script
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Script-to-Metadata Generator */}
              <div className="bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-5 space-y-3.5">
                <div>
                  <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                    Script-to-Metadata Pipeline
                  </h3>
                  <p className="text-[12px] text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
                    Writes Hook, Body, CTA, 4 SEO titles, timestamp chapters, tags, and pinned comment (40 credits).
                  </p>
                </div>
                <textarea
                  rows={3}
                  value={pipelineTopic}
                  onChange={(e) => setPipelineTopic(e.target.value)}
                  placeholder="Enter exact video topic or working title (e.g. How to build a 30-day evergreen content machine)..."
                  className="w-full p-3 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[12px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
                <div className="grid grid-cols-2 gap-2.5 text-[12px]">
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] block mb-1">
                      Video Format
                    </label>
                    <select
                      value={pipelineFormat}
                      onChange={(e) => setPipelineFormat(e.target.value as 'long_form' | 'short')}
                      className="w-full px-2.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                    >
                      <option value="long_form">Long-Form (8–14m)</option>
                      <option value="short">YouTube Short (&lt;60s)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-[#6B7280] block mb-1">
                      Delivery Tone
                    </label>
                    <select
                      value={pipelineTone}
                      onChange={(e) => setPipelineTone(e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-medium text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                    >
                      <option>High-Retention &amp; Practical</option>
                      <option>Executive Case Study</option>
                      <option>Fast-Paced Creator Breakdown</option>
                      <option>Storytelling Documentary</option>
                    </select>
                  </div>
                </div>
                <button
                  disabled={generatingPipeline}
                  onClick={() => handleGeneratePipeline()}
                  className="w-full py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md text-[12px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-60 transition-colors"
                >
                  {generatingPipeline ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} strokeWidth={1.5} className="text-[#06B6D4]" />}
                  {generatingPipeline ? 'Synthesizing Package...' : 'Generate Script & SEO Metadata'}
                </button>
              </div>
            </div>

            {/* Right: Active Script & Metadata Inspector */}
            <div className="lg:col-span-7">
              {generatingPipeline ? (
                <div className="bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-6 space-y-4">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-[#06B6D4]">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Synthesizing Hook, Script Body, CTA, SEO Titles, Chapters &amp; Thumbnail Brief...</span>
                  </div>
                  <div className="shimmer-block h-6 rounded w-3/4" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="shimmer-block h-12 rounded-md" />
                    <div className="shimmer-block h-12 rounded-md" />
                  </div>
                  <div className="shimmer-block h-32 rounded-md" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="shimmer-block h-24 rounded-md" />
                    <div className="shimmer-block h-24 rounded-md" />
                  </div>
                </div>
              ) : !activeVideo ? (
                <EmptyStatePanel
                  icon={<FileText size={22} strokeWidth={1.5} />}
                  title="No video script created yet"
                  description="Connect a YouTube channel and run the Script-to-Metadata Pipeline to generate editable Hook/Body/CTA scripts, SEO titles, chapters, tags, and pinned comments."
                />
              ) : (
                <div className="bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-5 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          label={activeVideo.status}
                          tone={activeVideo.status === 'published' ? 'emerald' : activeVideo.status === 'scheduled' ? 'cyan' : 'neutral'}
                        />
                        <span className="text-[11px] font-mono text-[#6B7280]">
                          {activeVideo.format === 'short' ? 'YouTube Short' : 'Long-Form'} · {activeVideo.playlist}
                        </span>
                      </div>
                      <input
                        value={activeVideo.selectedTitle}
                        onChange={(e) => onUpdateVideo({ ...activeVideo, selectedTitle: e.target.value })}
                        className="mt-2 w-full bg-transparent text-[15px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em] outline-none border-b border-transparent focus:border-[#06B6D4] pb-0.5"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleCopyAllPackage(activeVideo)}
                        className="px-2.5 py-1.5 border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] rounded-md text-[12px] font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5 transition-colors"
                      >
                        {copiedKey === 'all-pkg' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} strokeWidth={1.5} />} Copy All
                      </button>
                      <button
                        onClick={() => handleCrossPostVideo(activeVideo, ['x', 'linkedin', 'instagram'])}
                        className="px-3 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Send size={13} strokeWidth={1.5} /> Cross-Post X / LI / Reels
                      </button>
                      <button
                        onClick={() => onDeleteVideo(activeVideo.id)}
                        className="p-1.5 text-[#6B7280] hover:text-rose-500 rounded-md border border-[#E5E7EB] dark:border-white/[0.08] transition-colors"
                        title="Delete video pipeline"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  {/* Selectable SEO Titles */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">SEO Title Variations</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeVideo.seoTitles.map((title, idx) => (
                        <button
                          key={idx}
                          onClick={() => onUpdateVideo({ ...activeVideo, selectedTitle: title })}
                          className={`p-2.5 rounded-md border text-left text-[12px] transition-colors ${
                            activeVideo.selectedTitle === title
                              ? 'border-[#06B6D4] bg-[#F8F9FB] dark:bg-[#191D26] font-medium text-[#111827] dark:text-[#F3F4F6]'
                              : 'border-[#E5E7EB] dark:border-white/[0.08] text-[#4B5563] dark:text-[#9CA3AF] hover:border-[#D1D5DB] dark:hover:border-white/[0.15]'
                          }`}
                        >
                          <span className="font-mono text-[10px] text-[#6B7280] mr-1.5">#{idx + 1}</span>
                          {title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Editable Script: Hook / Body / CTA */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">Full Video Script</p>
                      <button
                        onClick={() =>
                          copyText(
                            'script',
                            `HOOK:\n${activeVideo.script.hook}\n\nBODY:\n${activeVideo.script.body}\n\nCTA:\n${activeVideo.script.cta}`,
                            'Full Video Script'
                          )
                        }
                        className="text-[11px] font-medium text-[#06B6D4] flex items-center gap-1 hover:underline"
                      >
                        {copiedKey === 'script' ? <Check size={12} /> : <Copy size={12} />} Copy Script
                      </button>
                    </div>
                    <div className="space-y-2.5 text-[12px]">
                      <div>
                        <label className="text-[11px] font-mono text-[#F97316] block mb-1">
                          0–15s Pattern-Interrupt Hook
                        </label>
                        <textarea
                          rows={2}
                          value={activeVideo.script.hook}
                          onChange={(e) =>
                            onUpdateVideo({
                              ...activeVideo,
                              script: { ...activeVideo.script, hook: e.target.value },
                            })
                          }
                          className="w-full p-2.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-[#6B7280] block mb-1">
                          Core Script Body
                        </label>
                        <textarea
                          rows={5}
                          value={activeVideo.script.body}
                          onChange={(e) =>
                            onUpdateVideo({
                              ...activeVideo,
                              script: { ...activeVideo.script, body: e.target.value },
                            })
                          }
                          className="w-full p-2.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[#111827] dark:text-[#F3F4F6] leading-relaxed outline-none focus:border-[#06B6D4]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-[#06B6D4] block mb-1">
                          End-Screen &amp; Subscribe CTA
                        </label>
                        <textarea
                          rows={2}
                          value={activeVideo.script.cta}
                          onChange={(e) =>
                            onUpdateVideo({
                              ...activeVideo,
                              script: { ...activeVideo.script, cta: e.target.value },
                            })
                          }
                          className="w-full p-2.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Chapters, Tags & Pinned Comment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08] text-[12px]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">Chapters</p>
                        <button
                          onClick={() =>
                            copyText(
                              'chapters',
                              activeVideo.chapters.map((c) => `${c.timestamp} ${c.label}`).join('\n'),
                              'YouTube Chapters'
                            )
                          }
                          className="text-[11px] font-medium text-[#06B6D4] hover:underline"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {activeVideo.chapters.map((ch, i) => (
                          <div key={i} className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="text-[#06B6D4] w-12 shrink-0 tabular-nums">
                              {ch.timestamp}
                            </span>
                            <span className="font-sans text-[#4B5563] dark:text-[#9CA3AF] truncate">{ch.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">Pinned Comment</p>
                          <button
                            onClick={() => copyText('pinned', activeVideo.pinnedComment, 'Pinned Comment')}
                            className="text-[11px] font-medium text-[#06B6D4] hover:underline"
                          >
                            Copy
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={activeVideo.pinnedComment}
                          onChange={(e) => onUpdateVideo({ ...activeVideo, pinnedComment: e.target.value })}
                          className="w-full p-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[11px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">
                            SEO Tags ({activeVideo.tags.length})
                          </p>
                          <button
                            onClick={() => copyText('tags', activeVideo.tags.join(', '), 'YouTube Tags')}
                            className="text-[11px] font-medium text-[#06B6D4] hover:underline"
                          >
                            Copy CSV
                          </button>
                        </div>
                        <p className="text-[11px] font-mono text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                          {activeVideo.tags.join(' · ')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 2: THUMBNAIL STUDIO & A/B PREVIEW */}
        {subTab === 'thumbnails' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {!activeVideo ? (
              <div className="lg:col-span-12">
                <EmptyStatePanel
                  icon={<ImageIcon size={22} strokeWidth={1.5} />}
                  title="No active video pipeline"
                  description="Create a video pipeline first to preview thumbnails across Desktop, Mobile, and Shorts feeds."
                />
              </div>
            ) : (
              <>
                <div className="lg:col-span-5 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-5 space-y-4 text-[12px]">
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6] tracking-[-0.01em]">
                      Thumbnail Concept &amp; A/B Controls
                    </h3>
                    <p className="text-[12px] text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
                      Verify title/thumbnail legibility and export 1280×720 SVG assets.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] block mb-1">
                      Overlay Headline (2–4 words)
                    </label>
                    <input
                      value={activeVideo.thumbnailHeadline}
                      onChange={(e) => onUpdateVideo({ ...activeVideo, thumbnailHeadline: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-semibold text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] block mb-1">
                      Accent Stripe
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['cyan', 'orange', 'indigo', 'emerald'] as const).map((color) => (
                        <button
                          key={color}
                          onClick={() => onUpdateVideo({ ...activeVideo, thumbnailAccent: color })}
                          className={`py-1.5 rounded-md border text-[11px] font-medium transition-colors ${
                            activeVideo.thumbnailAccent === color
                              ? 'border-[#06B6D4] bg-[#F8F9FB] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6]'
                              : 'border-[#E5E7EB] dark:border-white/[0.08] text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]'
                          }`}
                        >
                          {THUMBNAIL_ACCENTS[color].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] block mb-1">
                      A/B Title Test Variant
                    </label>
                    <div className="space-y-1.5">
                      {activeVideo.seoTitles.map((t, idx) => (
                        <button
                          key={idx}
                          onClick={() => setAbVariantIndex(idx)}
                          className={`w-full px-3 py-2 rounded-md border text-left text-[11px] transition-colors ${
                            abVariantIndex === idx
                              ? 'border-[#06B6D4] bg-[#F8F9FB] dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] font-medium'
                              : 'border-[#E5E7EB] dark:border-white/[0.08] text-[#4B5563] dark:text-[#9CA3AF]'
                          }`}
                        >
                          <span className="font-mono text-[#6B7280] mr-1.5">
                            Variant {String.fromCharCode(65 + idx)}:
                          </span>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">
                        AI Visual Direction Prompt
                      </label>
                      <button
                        onClick={() => copyText('thumb-prompt', activeVideo.thumbnailPrompt, 'Thumbnail Art Prompt')}
                        className="text-[11px] text-[#06B6D4] font-medium hover:underline"
                      >
                        Copy Prompt
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={activeVideo.thumbnailPrompt}
                      onChange={(e) => onUpdateVideo({ ...activeVideo, thumbnailPrompt: e.target.value })}
                      className="w-full p-2.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[11px] text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex-1 py-2 px-3 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-center font-medium text-[#111827] dark:text-[#F3F4F6] cursor-pointer hover:border-[#06B6D4] transition-colors">
                      Upload Backdrop
                      <input type="file" accept="image/*" onChange={handleUploadThumbnailImage} className="hidden" />
                    </label>
                    <button
                      onClick={() => handleExportThumbnailSvg(activeVideo)}
                      className="flex-1 py-2 px-3 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download size={13} strokeWidth={1.5} /> Export 1280×720
                    </button>
                  </div>
                </div>

                {/* Live Feed Preview Panel on Dot Grid Canvas */}
                <div className="lg:col-span-7 bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-3">
                    <h3 className="text-[14px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                      YouTube Surface Preview
                    </h3>
                    <div className="flex items-center gap-1 p-0.5 bg-[#F3F4F6] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md">
                      {[
                        { id: 'desktop' as const, label: 'Desktop', icon: Monitor },
                        { id: 'mobile' as const, label: 'Mobile', icon: Smartphone },
                        { id: 'shorts' as const, label: 'Shorts', icon: Play },
                      ].map((d) => {
                        const Icon = d.icon;
                        return (
                          <button
                            key={d.id}
                            onClick={() => setPreviewDevice(d.id)}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 whitespace-nowrap transition-colors ${
                              previewDevice === d.id
                                ? 'bg-white dark:bg-[#191D26] text-[#111827] dark:text-[#F3F4F6] border border-[#E5E7EB] dark:border-white/[0.08]'
                                : 'text-[#6B7280] border border-transparent'
                            }`}
                          >
                            <Icon size={12} strokeWidth={1.5} /> {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rendered Surface Mockup */}
                  <div className="canvas-dot-grid flex justify-center py-6 px-4 bg-[#F8F9FB] dark:bg-[#090A0D] rounded-lg border border-[#E5E7EB] dark:border-white/[0.08]">
                    {previewDevice === 'shorts' ? (
                      <div
                        className={`w-[260px] aspect-[9/16] rounded-xl overflow-hidden relative border border-white/[0.12] border-l-[4px] ${
                          (THUMBNAIL_ACCENTS[activeVideo.thumbnailAccent] || THUMBNAIL_ACCENTS.cyan).border
                        } bg-[#0E1015] flex flex-col justify-between p-4 text-white`}
                      >
                        {activeVideo.thumbnailUrl && (
                          <img
                            src={activeVideo.thumbnailUrl}
                            alt={activeVideo.selectedTitle}
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover opacity-35"
                          />
                        )}
                        <div className={`relative z-10 text-[11px] font-mono ${(THUMBNAIL_ACCENTS[activeVideo.thumbnailAccent] || THUMBNAIL_ACCENTS.cyan).textClass}`}>
                          Shorts · {activeChannel?.handle || '@channel'}
                        </div>
                        <div className="relative z-10 space-y-2">
                          <p className="text-2xl font-bold uppercase tracking-[-0.02em] leading-none">
                            {activeVideo.thumbnailHeadline}
                          </p>
                          <p className="text-[12px] text-[#D1D5DB] line-clamp-2">
                            {activeVideo.seoTitles[abVariantIndex] || activeVideo.selectedTitle}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className={previewDevice === 'mobile' ? 'w-[340px]' : 'w-full max-w-[540px]'}>
                        <div
                          className={`relative aspect-video rounded-lg overflow-hidden bg-[#0E1015] border border-white/[0.12] border-l-[4px] ${
                            (THUMBNAIL_ACCENTS[activeVideo.thumbnailAccent] || THUMBNAIL_ACCENTS.cyan).border
                          } p-6 flex flex-col justify-between text-white`}
                        >
                          {activeVideo.thumbnailUrl && (
                            <img
                              src={activeVideo.thumbnailUrl}
                              alt={activeVideo.selectedTitle}
                              referrerPolicy="no-referrer"
                              className="absolute inset-0 w-full h-full object-cover opacity-35"
                            />
                          )}
                          <div className="relative z-10 flex items-center justify-between text-[11px] font-mono">
                            <span className={(THUMBNAIL_ACCENTS[activeVideo.thumbnailAccent] || THUMBNAIL_ACCENTS.cyan).textClass}>
                              {activeChannel?.channelName || workspaceName}
                            </span>
                            <span className="bg-black/80 px-1.5 py-0.5 rounded text-[10px] tabular-nums">
                              {activeVideo.format === 'short' ? '0:54' : '11:24'}
                            </span>
                          </div>
                          <div className="relative z-10">
                            <p className="text-2xl sm:text-3xl font-bold uppercase tracking-[-0.02em] leading-tight">
                              {activeVideo.thumbnailHeadline}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-3 px-1">
                          <div className="w-8 h-8 rounded-full bg-[#111827] dark:bg-[#191D26] border border-[#E5E7EB] dark:border-white/[0.12] text-white font-semibold text-[11px] flex items-center justify-center shrink-0">
                            {(activeChannel?.channelName || 'YT').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-[#111827] dark:text-[#F3F4F6] leading-snug line-clamp-2">
                              {activeVideo.seoTitles[abVariantIndex] || activeVideo.selectedTitle}
                            </p>
                            <p className="text-[11px] text-[#6B7280] mt-1">
                              {activeChannel?.channelName || workspaceName} · {activeVideo.playlist}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* SUB-TAB 3: BULK UPLOAD & EVERGREEN PLAYLIST QUEUE */}
        {subTab === 'queue' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg p-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-3 text-[12px]">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    className="px-3 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] block mb-1">
                    Cadence (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={bulkCadenceDays}
                    onChange={(e) => setBulkCadenceDays(Math.max(1, Number(e.target.value) || 2))}
                    className="w-24 px-3 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <button
                  onClick={handleBulkScheduleQueue}
                  className="px-3.5 py-1.5 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Calendar size={13} strokeWidth={1.5} /> Bulk Schedule Unscheduled
                </button>
              </div>

              <div className="flex items-center gap-2 text-[12px]">
                <input
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="New evergreen playlist..."
                  className="px-3 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
                <button
                  onClick={handleAddPlaylist}
                  className="px-3 py-1.5 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] hover:border-[#D1D5DB] dark:hover:border-white/[0.15] text-[#111827] dark:text-[#F3F4F6] rounded-md font-medium flex items-center gap-1 whitespace-nowrap transition-colors"
                >
                  <FolderPlus size={13} strokeWidth={1.5} /> Add Playlist
                </button>
                <button
                  onClick={handleExportQueueCsv}
                  className="px-3 py-1.5 border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-medium text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1 whitespace-nowrap transition-colors"
                >
                  <Download size={13} strokeWidth={1.5} /> CSV
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.08] rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead className="sticky top-0 bg-[#F8F9FB] dark:bg-[#0E1015] border-b border-[#E5E7EB] dark:border-white/[0.08]">
                  <tr className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">
                    <th className="py-2.5 px-4 font-medium">Video Title</th>
                    <th className="py-2.5 px-4 font-medium">Format</th>
                    <th className="py-2.5 px-4 font-medium">Auto-Add Playlist</th>
                    <th className="py-2.5 px-4 font-medium">Status &amp; Drop Date</th>
                    <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] dark:divide-white/[0.06]">
                  {channelVideos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-[#6B7280]">
                        No videos in queue yet. Generate a script in the Ideation &amp; Script Pipeline tab to populate your upload queue.
                      </td>
                    </tr>
                  ) : (
                    channelVideos.map((video) => (
                      <tr key={video.id} className="h-12 hover:bg-[#F8F9FB] dark:hover:bg-[#191D26] transition-colors">
                        <td className="py-2.5 px-4 font-medium text-[#111827] dark:text-[#F3F4F6] max-w-sm truncate">
                          {video.selectedTitle}
                        </td>
                        <td className="py-2.5 px-4 text-[#4B5563] dark:text-[#9CA3AF] whitespace-nowrap">
                          {video.format === 'short' ? 'YouTube Short' : 'Long-Form'}
                        </td>
                        <td className="py-2.5 px-4">
                          <select
                            value={video.playlist}
                            onChange={(e) => onUpdateVideo({ ...video, playlist: e.target.value })}
                            className="px-2 py-1 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded text-[11px] text-[#111827] dark:text-[#F3F4F6] outline-none"
                          >
                            {(activeChannel?.playlists || ['Core Uploads', 'YouTube Shorts']).map((pl) => (
                              <option key={pl} value={pl}>
                                {pl}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] tabular-nums text-[#4B5563] dark:text-[#9CA3AF]">
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              label={video.status}
                              tone={video.status === 'published' ? 'emerald' : video.status === 'scheduled' ? 'cyan' : 'neutral'}
                            />
                            {video.scheduledAt ? (
                              <span className="inline-flex items-center gap-1 text-[#06B6D4]">
                                <Clock size={11} /> {new Date(video.scheduledAt).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-[#6B7280]">Unscheduled</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap space-x-2.5">
                          {video.status !== 'scheduled' && video.status !== 'published' && (
                            <button
                              onClick={() => handleScheduleSingleVideo(video)}
                              className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                            >
                              Schedule Drop
                            </button>
                          )}
                          <button
                            onClick={() => handleCrossPostVideo(video, ['x', 'linkedin', 'instagram'])}
                            className="text-[#06B6D4] font-medium hover:underline"
                          >
                            Cross-Post
                          </button>
                          <button
                            onClick={() =>
                              onUpdateVideo({
                                ...video,
                                status: video.status === 'published' ? 'scheduled' : 'published',
                                scheduledAt: video.scheduledAt || new Date().toISOString(),
                              })
                            }
                            className="text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F3F4F6] font-medium hover:underline"
                          >
                            {video.status === 'published' ? 'Unpublish' : 'Mark Published'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Connect Channel Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConnectModal(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#13161D] border border-[#E5E7EB] dark:border-white/[0.12] rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              <h3 className="text-[15px] font-semibold text-[#111827] dark:text-[#F3F4F6]">
                Connect YouTube Channel
              </h3>
              <button onClick={() => setShowConnectModal(false)} className="text-[#6B7280] hover:text-[#111827] dark:hover:text-[#F3F4F6]">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleConnectChannel} className="mt-4 space-y-3.5 text-[12px]">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] block mb-1">
                  Channel Name
                </label>
                <input
                  required
                  value={channelForm.channelName}
                  onChange={(e) => setChannelForm({ ...channelForm, channelName: e.target.value })}
                  placeholder="e.g. Acme Growth Studio"
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] block mb-1">Handle</label>
                  <input
                    value={channelForm.handle}
                    onChange={(e) => setChannelForm({ ...channelForm, handle: e.target.value })}
                    placeholder="@acmegrowth"
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] block mb-1">Default Playlist</label>
                  <input
                    value={channelForm.defaultPlaylist}
                    onChange={(e) => setChannelForm({ ...channelForm, defaultPlaylist: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] block mb-1">Content Niche</label>
                <input
                  value={channelForm.niche}
                  onChange={(e) => setChannelForm({ ...channelForm, niche: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] block mb-1">Subscribers</label>
                  <input
                    type="number"
                    min={0}
                    value={channelForm.subscribers}
                    onChange={(e) => setChannelForm({ ...channelForm, subscribers: e.target.value })}
                    className="w-full px-2.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] block mb-1">Watch Hrs (30d)</label>
                  <input
                    type="number"
                    min={0}
                    value={channelForm.watchHours30d}
                    onChange={(e) => setChannelForm({ ...channelForm, watchHours30d: e.target.value })}
                    className="w-full px-2.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#6B7280] block mb-1">Daily Quota</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={channelForm.dailyUploadQuotaLimit}
                    onChange={(e) => setChannelForm({ ...channelForm, dailyUploadQuotaLimit: e.target.value })}
                    className="w-full px-2.5 py-2 bg-[#F8F9FB] dark:bg-[#0E1015] border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-mono text-[#111827] dark:text-[#F3F4F6] outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="flex-1 py-2 border border-[#E5E7EB] dark:border-white/[0.08] rounded-md font-medium text-[#4B5563] dark:text-[#9CA3AF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2 bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-white dark:text-[#090A0D] dark:hover:bg-[#E5E7EB] rounded-md font-medium transition-colors"
                >
                  Connect Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
