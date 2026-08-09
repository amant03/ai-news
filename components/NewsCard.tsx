import { NewsItem, CATEGORIES, SOURCES, Category, SourceFilter } from '@/lib/types';

interface NewsCardProps {
  item: NewsItem;
}

function getSourceColor(source: string): string {
  const found = SOURCES.find(s => s.value === source);
  return found?.color || '#6b7280';
}

function getCategoryInfo(category: string) {
  return CATEGORIES.find(c => c.value === category) || CATEGORIES[5];
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function NewsCard({ item }: NewsCardProps) {
  const categoryInfo = getCategoryInfo(item.category);
  const sourceColor = getSourceColor(item.source);
  
  return (
    <article className="group border-b border-gray-800/50 py-4 px-4 hover:bg-gray-800/30 transition-colors">
      <div className="flex items-start gap-3">
        {/* Source indicator */}
        <div 
          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
          style={{ backgroundColor: sourceColor }}
        />
        
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-medium text-gray-300">
              {item.author}
            </span>
            <span className="text-gray-600">·</span>
            <span className="text-xs text-gray-500">
              {timeAgo(item.published_at)}
            </span>
            {item.source_type === 'twitter' && item.tweet_metrics && (
              <>
                <span className="text-gray-600">·</span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  {formatNumber(item.tweet_metrics.likeCount)}
                </span>
              </>
            )}
          </div>
          
          {/* Title */}
          <a 
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-100 font-medium hover:text-blue-400 transition-colors line-clamp-2"
          >
            {item.title}
          </a>
          
          {/* Summary */}
          {item.summary && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
              {item.summary}
            </p>
          )}
          
          {/* Footer */}
          <div className="flex items-center gap-2 mt-2">
            <span 
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${categoryInfo.color}20`,
                color: categoryInfo.color,
              }}
            >
              {categoryInfo.label}
            </span>
            {item.source_type === 'twitter' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                Tweet
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
