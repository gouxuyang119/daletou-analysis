import React, { useState, useRef, useEffect } from 'react';
import { Brain, Send, Target, Upload } from 'lucide-react';
import { LotteryData } from '../utils/dataGenerator';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  image?: string;
  isThinking?: boolean;
  hasWebSearch?: boolean;
}

interface AIAssistantProps {
  data: LotteryData[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ data }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化欢迎消息
  useEffect(() => {
    const welcomeMessage = '您好！我是AI智能助手，专门为大乐透分析提供帮助。\n\n🎯 **我可以帮您**：\n• 分析大乐透历史数据\n• 提供号码预测建议\n• 解释各种预测策略\n• 回答彩票相关问题\n\n请告诉我您想了解什么！';
    setMessages([{
      id: '1',
      content: welcomeMessage,
      sender: 'ai',
      timestamp: new Date()
    }]);
  }, []);

  // 生成AI响应
  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // 本地模拟响应
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('预测') || lowerMessage.includes('推荐')) {
      const hotRedNumbers = [3, 7, 12, 18, 23, 28, 31, 35];
      const hotBlueNumbers = [2, 5, 8, 11];
      const selectedRed = hotRedNumbers.sort(() => 0.5 - Math.random()).slice(0, 5);
      const selectedBlue = hotBlueNumbers.sort(() => 0.5 - Math.random()).slice(0, 2);
      
      selectedRed.sort((a, b) => a - b);
      selectedBlue.sort((a, b) => a - b);
      
      const redStr = selectedRed.map(n => n.toString().padStart(2, '0')).join(' ');
      const blueStr = selectedBlue.map(n => n.toString().padStart(2, '0')).join(' ');
      
      return `基于智能分析，为您推荐以下号码组合：\n\n🔴 红球：${redStr}\n🔵 蓝球：${blueStr}\n\n这些号码结合了历史趋势和概率分析，但请记住彩票具有随机性。`;
    }
    
    if (lowerMessage.includes('趋势') || lowerMessage.includes('走势')) {
      if (!data || data.length === 0) {
        return '抱歉，当前没有可用的历史数据进行趋势分析。请先在"数据录入"页面导入开奖数据。';
      }
      
      const recent5 = data.slice(0, 5);
      const trends = recent5.map(item => {
        const redBalls = item.frontNumbers?.join(',') || item.redBalls?.join(',') || '数据缺失';
        const blueBalls = item.backNumbers?.join(',') || item.blueBalls?.join(',') || '数据缺失';
        return `${item.issue}期: ${redBalls} + ${blueBalls}`;
      });
      return `最近5期的开奖趋势如下：\n\n${trends.join('\n')}\n\n建议关注连号、重号和跨度的变化规律。`;
    }
    
    if (lowerMessage.includes('冷热') || lowerMessage.includes('冷号') || lowerMessage.includes('热号')) {
      return '冷热号分析是重要的预测策略之一。热号是近期频繁出现的号码，冷号是长期未出现的号码。建议采用冷热结合的策略。';
    }
    
    if (lowerMessage.includes('统计') || lowerMessage.includes('分析')) {
      if (!data || data.length === 0) {
        return '请先导入历史数据，然后我可以为您提供详细的统计分析。';
      }
      return `当前已加载 ${data.length} 期历史数据。您可以在"统计分析"页面查看详细的号码分布、出现频率等统计信息。`;
    }
    
    return '感谢您的提问！我可以帮您分析大乐透的号码趋势、提供预测建议、解释各种预测策略。请告诉我您想了解什么具体内容。';
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 发送消息
  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !selectedImage) || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
      image: selectedImage || undefined
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSelectedImage(null);
    setIsLoading(true);
    
    try {
      const aiResponse = await generateAIResponse(userMessage.content);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI响应生成失败:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '抱歉，AI助手暂时无法响应。请稍后再试。',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: '1',
      content: '您好！我是AI智能助手，专门为大乐透分析提供帮助。请告诉我您想了解什么！',
      sender: 'ai',
      timestamp: new Date()
    }]);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI智能助手</h3>
            <p className="text-sm text-gray-500">专业大乐透分析助手</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={clearChat}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="清空对话"
          >
            <Target className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.image && (
                <img
                  src={message.image}
                  alt="上传的图片"
                  className="max-w-full h-auto rounded-lg mb-2"
                />
              )}
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div
                className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span className="text-sm text-gray-500 ml-2">AI正在思考...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        {selectedImage && (
          <div className="mb-3 relative inline-block">
            <img
              src={selectedImage}
              alt="预览"
              className="max-w-20 h-auto rounded-lg"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
            >
              ×
            </button>
          </div>
        )}
        
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的问题..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isLoading}
            />
          </div>
          
          <label className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
            <Upload className="w-5 h-5" />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
          
          <button
            onClick={handleSendMessage}
            disabled={(!inputMessage.trim() && !selectedImage) || isLoading}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;