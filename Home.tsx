/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  GoogleGenAI,
} from '@google/genai';
import {
  Download,
  FileImage,
  Film,
  LoaderCircle,
  SendHorizontal,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import {useState, useRef} from 'react';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

function parseError(error: string): React.ReactNode {
  if (error.includes('429') && error.includes('RESOURCE_EXHAUSTED')) {
    return (
      <>
        You've exceeded your current API quota (Rate Limit). This is a usage
        limit on Google's servers.
        <br />
        <br />
        Please check your plan and billing details, or try again after some
        time. For more information, visit the{' '}
        <a
          href="https://ai.google.dev/gemini-api/docs/rate-limits"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          Gemini API rate limits documentation
        </a>
        .
      </>
    );
  }
  const regex = /"message":\s*"(.*?)"/g;
  const match = regex.exec(error);
  if (match && match[1]) {
    return match[1];
  }
  return error;
}


export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [generatedVideos, setGeneratedVideos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<React.ReactNode>('');
  const [showSettings, setShowSettings] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{data: string; mimeType: string; name: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [numberOfVideos, setNumberOfVideos] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('16:9');

  const handleClear = () => {
    generatedVideos.forEach(URL.revokeObjectURL);
    setGeneratedVideos([]);
    setPrompt('');
    setUploadedImage(null);
    // Reset settings
    setNumberOfVideos(1);
    setAspectRatio('16:9');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const base64Data = dataUrl.split(',')[1];
      setUploadedImage({
        data: base64Data,
        mimeType: file.type,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset file input to allow re-uploading the same file
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!prompt && !uploadedImage) {
      setErrorMessage('Please enter a prompt or upload an image to generate a video.');
      setShowErrorModal(true);
      return;
    }
    setIsLoading(true);
    generatedVideos.forEach(URL.revokeObjectURL);
    setGeneratedVideos([]);
    setLoadingMessage('Initializing video generation...');

    let payload: any;

    try {
      const config: any = {
        numberOfVideos: Number(numberOfVideos),
        aspectRatio,
      };

      payload = {
        model: 'veo-2.0-generate-001',
        prompt,
        config,
      };

      if (uploadedImage) {
        payload.image = {
          imageBytes: uploadedImage.data,
          mimeType: uploadedImage.mimeType,
        };
      }

      let operation = await ai.models.generateVideos(payload);

      setLoadingMessage('Generating video... This can take a few minutes.');
      
      let pollCount = 0;
      const maxPolls = 60; // 10 minutes max (60 polls * 10 seconds)

      while (!operation.done && pollCount < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
        pollCount++;
        setLoadingMessage(`Polling for status (${pollCount}/${maxPolls})... Please wait.`);
      }

      if (!operation.done) {
        throw new Error('Video generation timed out. Please try again.');
      }

      if (!operation.response?.generatedVideos || operation.response.generatedVideos.length === 0) {
        throw new Error('Video generation failed to produce a result. Please check your prompt and settings.');
      }
      
      setLoadingMessage('Fetching video data...');

      const videoUrls: string[] = [];
      for (const videoData of operation.response.generatedVideos) {
        const uri = videoData.video.uri;
        const videoResponse = await fetch(`${uri}&key=${process.env.API_KEY}`);
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video: ${videoResponse.statusText}`);
        }
        const blob = await videoResponse.blob();
        const url = URL.createObjectURL(blob);
        videoUrls.push(url);
      }
      
      setGeneratedVideos(videoUrls);

    } catch (error) {
      console.error('Error generating video:', error);
      const rawMessage = (error as Error).message || 'An unexpected error occurred.';
      const modelInUse = payload?.model || 'the model';
      if (rawMessage.includes('Requested entity was not found')) {
        setErrorMessage(`Error: The model '${modelInUse}' was not found. Please check the model name.`);
      } else {
        setErrorMessage(parseError(rawMessage));
      }
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDownload = (src: string, index: number) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `veo-studio-${index + 1}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
  };

  const aspectRatios = ['16:9', '9:16', '1:1', '4:3', '3:4'];

  const SettingButton = ({onClick, current, value, children}) => (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
        current === value
          ? 'bg-black text-white'
          : 'bg-gray-200 hover:bg-gray-300'
      }`}>
      {children}
    </button>
  );

  return (
    <>
      <div className="min-h-screen text-gray-900 flex flex-col justify-start items-center">
        <main className="container mx-auto px-3 sm:px-6 py-5 sm:py-10 pb-32 max-w-5xl w-full">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-8 gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-0 leading-tight">
                VEO Studio
              </h1>
              <p className="text-sm sm:text-base text-gray-500 mt-1">
                Powered by the{' '}
                <a
                  className="underline"
                  href="https://ai.google.dev/gemini-api/docs/models/veo"
                  target="_blank"
                  rel="noopener noreferrer">
                  Google Gemini API
                </a>
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-110 ${
                  showSettings ? 'bg-gray-200' : 'bg-white hover:bg-gray-50'
                }`}
                aria-label="Toggle Settings">
                <SlidersHorizontal className="w-6 h-6 text-gray-700" />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-sm transition-all hover:bg-gray-50 hover:scale-110"
                aria-label="Clear Results">
                <Trash2 className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </div>

          <div
            className={`w-full mb-6 h-[60vh] bg-gray-200/50 rounded-lg flex justify-center p-4 border-2 border-dashed border-gray-300 overflow-y-auto ${
              generatedVideos.length > 0 ? 'items-start' : 'items-center'
            }`}>
            {isLoading ? (
              <div className="text-center text-gray-600 self-center">
                <LoaderCircle className="w-12 h-12 animate-spin mx-auto" />
                <p className="mt-4 font-semibold">{loadingMessage}</p>
                <p className="text-sm text-gray-500">Video generation can take several minutes.</p>
              </div>
            ) : generatedVideos.length > 0 ? (
              <div
                className={`grid gap-4 w-full ${
                  generatedVideos.length > 1
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1'
                }`}>
                {generatedVideos.map((src, index) => (
                  <div
                    key={index}
                    className="relative group flex items-center justify-center bg-black/5 rounded-md overflow-hidden aspect-video">
                    <video
                      src={src}
                      controls
                      autoPlay
                      loop
                      muted
                      className="max-w-full max-h-full object-contain rounded-md"
                    />
                    <button
                      onClick={() => handleDownload(src, index)}
                      className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                      aria-label="Download video">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <Film className="w-12 h-12 mx-auto" />
                <h3 className="font-semibold text-lg mt-4">
                  Your generated videos will appear here
                </h3>
                <p>Enter a prompt or upload an image below to get started</p>
              </div>
            )}
          </div>

          {uploadedImage && (
            <div className="mb-4 p-3 border rounded-lg bg-gray-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <img src={`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`} alt="upload preview" className="w-12 h-12 object-cover rounded" />
                <span className="text-sm font-medium text-gray-700 truncate">{uploadedImage.name}</span>
              </div>
              <button onClick={handleRemoveImage} className="p-1 rounded-full hover:bg-gray-200" aria-label="Remove image">
                <X className="w-5 h-5"/>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative">
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-800" aria-label="Upload image">
                <FileImage className="w-5 sm:w-6 h-5 sm:h-6" />
              </button>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want to create..."
                className="w-full p-3 sm:p-4 pl-12 sm:pl-14 pr-12 sm:pr-14 text-sm sm:text-base border-2 border-black bg-white text-gray-800 shadow-sm focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all h-14"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-none bg-black text-white hover:cursor-pointer hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                aria-label="Submit">
                {isLoading ? (
                  <LoaderCircle
                    className="w-5 sm:w-6 h-5 sm:h-6 animate-spin"
                    aria-label="Loading"
                  />
                ) : (
                  <SendHorizontal className="w-5 sm:w-6 h-5 sm:h-6" />
                )}
              </button>
            </div>
          </form>
        </main>

        {showSettings && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4"
            onClick={() => setShowSettings(false)}>
            <div
              className="bg-white rounded-lg shadow-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-bold">Settings</h2>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded-full hover:bg-gray-100"
                  aria-label="Close settings">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                <div>
                  <label htmlFor="num-videos" className="block text-sm font-medium text-gray-700 mb-2">Number of Videos</label>
                  <input type="number" id="num-videos" min="1" max="4" value={numberOfVideos} onChange={(e) => {const val = Math.max(1, Math.min(4, Number(e.target.value))); setNumberOfVideos(val);}} className="w-24 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500" />
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</span>
                  <div className="flex flex-wrap gap-2">{aspectRatios.map((ratio) => (<SettingButton key={ratio} onClick={setAspectRatio} current={aspectRatio} value={ratio}>{ratio}</SettingButton>))}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showErrorModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-700">
                  Video Generation Failed
                </h3>
                <button
                  onClick={closeErrorModal}
                  className="text-gray-400 hover:text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="font-medium text-gray-600">
                {errorMessage}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
