'use client'
interface VideoInfoProps {
  videoTitle: string;
  channelInfo: { name: string; avatar: string };
  isLoading?: boolean; // حالة التحميل
}

const VideoInfo: React.FC<VideoInfoProps> = ({ videoTitle, channelInfo, isLoading = false }) => {
  return (
  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4 mt-4">
    {isLoading ? (
      <div className="flex items-center justify-center w-full">
        <i className="fas fa-spinner fa-spin text-text-primary text-2xl"></i>
      </div>
    ) : (
      <>
        <img
          src={channelInfo.avatar || 'https://via.placeholder.com/40'}
          alt="Channel Avatar"
          className="w-15 h-15 rounded-md"
        />
        <div>
          <h1 className="text-base w-full font-bold text-text-primary mb-16">
            {videoTitle.replace(/_/g, ' ')}
          </h1>
          <p className="text-sm font-semibold text-text-primary">
            {channelInfo.name || 'Unknown Channel'}
          </p>
        </div>
      </>
    )}
  </div>
);
};

export default VideoInfo;