import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, PieChart, BarChart3, Thermometer, Calculator, Database, Brain, MessageCircle, Archive, Target, RefreshCw, Download, AlertCircle, Menu, X } from 'lucide-react';
import TrendChart from './components/TrendChart';
import HotColdAnalysis from './components/HotColdAnalysis';
import PrizeCalculator from './components/PrizeCalculator';
import StatisticsPanel from './components/StatisticsPanel';
import DataInput from './components/DataInput';
import SmartPrediction from './components/SmartPrediction';
import CombinationAnalysis from './components/CombinationAnalysis';
import AIAssistant from './components/AIAssistant';
import HistoryManager from './components/HistoryManager';
import { LotteryData } from './utils/dataGenerator';

function App() {
  const [activeTab, setActiveTab] = useState('trend');
  const [lotteryData, setLotteryData] = useState<LotteryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 历史标签状态已移除
  const [isDataPersisted, setIsDataPersisted] = useState<boolean>(false);
  const [selectedTargetIssue, setSelectedTargetIssue] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // 生成模拟数据的函数已移除

  // 处理错误信息
  const handleError = (message: string) => {
    setErrorMessage(message);
    // 5秒后自动清除错误信息
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // 刷新数据
  const handleRefreshData = () => {
    if (!dataLoaded) {
      handleError('请先在"数据录入"页面导入数据');
      return;
    }
    
    // 仅在有数据的情况下刷新
    if (lotteryData.length > 0) {
      setIsLoading(true);
      setTimeout(() => {
        setLastUpdate(new Date());
        setIsLoading(false);
      }, 500);
    }
  };

  // 处理数据更新
  const handleDataUpdate = (newData: LotteryData[]) => {
    console.log('🔄 App.tsx - 处理数据更新:', newData.length, '条记录');
    console.log('🎯 App.tsx - 检查25086期数据:', newData.find(d => String(d.issue) === '25086'));
    
    setLotteryData(newData);
    const updateTime = new Date();
    setLastUpdate(updateTime);
    setDataLoaded(true); 
    setIsDataPersisted(true);
    
    // Store data in localStorage to prevent loss during component remounts
    try {
      localStorage.setItem('lotteryData', JSON.stringify(newData));
      localStorage.setItem('dataLoaded', 'true');
      localStorage.setItem('lastUpdate', updateTime.toISOString());
      console.log('Saved data to localStorage:', newData.length, 'records');
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
    }
  };

  // 导出数据
  const handleExportData = () => {
    const dataStr = JSON.stringify(lotteryData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lottery_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 清除错误信息
  const clearError = () => {
    setErrorMessage(null);
  };
  
  // 处理标签切换
  const handleTabChange = (tabId: string) => {
    // 避免重复切换
    if (tabId === activeTab) return;
    setActiveTab(tabId);
    
    // 如果不是从组合分析跳转到走势图，清除目标期号
    if (tabId !== 'trend' || activeTab !== 'combination') {
      setSelectedTargetIssue('');
    }
    
    // Save active tab to localStorage
    try {
      localStorage.setItem('activeTab', tabId);
    } catch (error) {
      console.log('Failed to save active tab to localStorage:', error);
      console.error('Failed to save active tab to localStorage:', error);
    }
    
    setIsMobileMenuOpen(false); // 关闭移动端菜单
  };

  // 处理从组合分析跳转到走势图
  const handleNavigateToTrend = (targetIssue: string) => {
    // 设置目标期号
    setSelectedTargetIssue(targetIssue);
    // 切换到走势图页面
    handleTabChange('trend');
    console.log('跳转到走势图，目标期号:', targetIssue);
  };

  // Load data from localStorage on initial mount
  useEffect(() => {
    try {
      console.log('🔍 App.tsx - 检查localStorage中的保存数据...');
      const savedDataLoaded = localStorage.getItem('dataLoaded') === 'true';
      console.log('📊 App.tsx - savedDataLoaded:', savedDataLoaded);
      
      if (savedDataLoaded) {
        const savedData = localStorage.getItem('lotteryData');
        const savedLastUpdate = localStorage.getItem('lastUpdate');
        
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          console.log('📊 App.tsx - 解析的原始数据长度:', parsedData.length);
          
          // Convert string dates back to Date objects
          const processedData = parsedData.map((item: LotteryData) => ({
            ...item,
            date: new Date(item.date),
            frontNumbers: item.frontNumbers || item.redBalls,
            backNumbers: item.backNumbers || item.blueBalls,
          }));
          
          const issue25086 = processedData.find((d: { issue: string | number }) => d.issue === '25086' || d.issue === 25086 || String(d.issue) === '25086');
          console.log('🎯 App.tsx - 处理后数据中的25086期:', issue25086);
          console.log('📋 App.tsx - 数据期号范围:', {
            first: processedData[0]?.issue,
            last: processedData[processedData.length - 1]?.issue,
            total: processedData.length
          });
          
          // 如果找到25086期数据，显示详细信息
          if (issue25086) {
            console.log('✅ 找到25086期数据:', {
              issue: issue25086.issue,
              frontNumbers: issue25086.frontNumbers,
              backNumbers: issue25086.backNumbers,
              date: issue25086.date
            });
          } else {
            console.log('❌ 未找到25086期数据');
            console.log('📋 所有期号:', processedData.map(d => d.issue).slice(0, 20));
          }
          
          setLotteryData(processedData);
          setDataLoaded(true);
          setIsDataPersisted(true);
          
          if (savedLastUpdate) {
            setLastUpdate(new Date(savedLastUpdate));
          }

          // Also restore active tab if available
          const savedTab = localStorage.getItem('activeTab');
          if (savedTab) {
            setActiveTab(savedTab);
          }
          console.log('✅ App.tsx - 成功从localStorage加载数据');
          
          console.log('Loaded data from localStorage:', processedData.length, 'records');
        }
      } else {
        console.log('❌ App.tsx - localStorage中没有找到数据');
      }
    } catch (error) {
      console.error('❌ App.tsx - 从localStorage加载数据失败:', error);
    }
  }, []);
  
  // 确保数据持久化
  useEffect(() => {
    if (dataLoaded && lotteryData.length > 0 && !isDataPersisted) {
      console.log('Persisting data to localStorage...');
      try {
        localStorage.setItem('lotteryData', JSON.stringify(lotteryData));
        localStorage.setItem('dataLoaded', 'true');
        setIsDataPersisted(true);
      } catch (error) {
        console.error('Failed to persist data to localStorage:', error);
      }
    }
  }, [dataLoaded, lotteryData, isDataPersisted]);

  const tabs = [
    { id: 'trend', label: '走势分析', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'combination', label: '组合分析', icon: <PieChart className="w-4 h-4" /> },
    { id: 'statistics', label: '统计分析', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'hotcold', label: '冷热分析', icon: <Thermometer className="w-4 h-4" /> },
    { id: 'calculator', label: '奖金计算', icon: <Calculator className="w-4 h-4" /> },
    { id: 'datainput', label: '数据录入', icon: <Database className="w-4 h-4" /> },
    { id: 'smartprediction', label: '智能预测', icon: <Brain className="w-4 h-4" /> },
    { id: 'aiassistant', label: 'AI智能体', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'history', label: '历史保存', icon: <Archive className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-red-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">超级大乐透智能分析系统</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">专业走势分析 · 智能预测 · 奖金计算</p>
              </div>
            </div>
            
            {/* 桌面端操作按钮 */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
              <div className="text-xs lg:text-sm text-gray-500 hidden lg:block">
                数据期数: {dataLoaded ? lotteryData.length : 0} | 最后更新: {dataLoaded ? lastUpdate.toLocaleString() : '未导入数据'}
              </div>
              <button
                onClick={handleRefreshData}
                disabled={isLoading}
                className="flex items-center space-x-1 lg:space-x-2 px-2 lg:px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 touch-manipulation min-h-[40px]"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden lg:inline text-sm">刷新</span>
              </button>
              <button
                onClick={handleExportData}
                className="flex items-center space-x-1 lg:space-x-2 px-2 lg:px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors touch-manipulation min-h-[40px]"
              >
                <Download className="w-4 h-4" />
                <span className="hidden lg:inline text-sm">导出</span>
              </button>
            </div>

            {/* 移动端菜单按钮 */}
            <div className="md:hidden flex items-center space-x-1">
              <button
                onClick={handleRefreshData}
                disabled={isLoading}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 touch-manipulation min-h-[40px] min-w-[40px]"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-h-[40px] min-w-[40px]"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 错误提示 */}
      {errorMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">操作错误</p>
              <p className="text-sm">{errorMessage}</p>
            </div>
            <button 
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-gray-50 border-b border-gray-200">
        {/* 桌面端导航 */}
        <div className="hidden md:block">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex space-x-2 lg:space-x-8 overflow-x-auto py-3 lg:py-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1 lg:space-x-2 px-3 lg:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap touch-manipulation min-h-[40px] text-sm lg:text-base ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 移动端导航 */}
        <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
          <div className="px-3 py-2 space-y-1 bg-white border-t border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors touch-manipulation min-h-[48px] ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                <span className="text-base">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">正在加载数据...</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'trend' && <TrendChart data={lotteryData} dataLoaded={dataLoaded} onError={handleError} targetIssue={selectedTargetIssue} />}
              {activeTab === 'combination' && <CombinationAnalysis data={lotteryData} dataLoaded={dataLoaded} onError={handleError} onNavigateToTrend={handleNavigateToTrend} />}
              {activeTab === 'statistics' && (
                <StatisticsPanel 
                  data={lotteryData} 
                  dataLoaded={dataLoaded} 
                  onError={handleError} 
                  key={`statistics-${dataLoaded}-${lotteryData.length}`}
                />
              )}
              {activeTab === 'hotcold' && <HotColdAnalysis data={lotteryData} dataLoaded={dataLoaded} onError={handleError} />}
              {activeTab === 'calculator' && <PrizeCalculator />}
              {activeTab === 'datainput' && <DataInput onDataUpdate={handleDataUpdate} onError={handleError} />}
              {activeTab === 'smartprediction' && <SmartPrediction data={lotteryData} dataLoaded={dataLoaded} />}
              {activeTab === 'aiassistant' && <AIAssistant data={lotteryData} dataLoaded={dataLoaded} onError={handleError} />}
              {activeTab === 'history' && <HistoryManager data={lotteryData} dataLoaded={dataLoaded} onError={handleError} />}
            </>
          )}
        </div>
      </main>


    </div>
  );
}

export default App;