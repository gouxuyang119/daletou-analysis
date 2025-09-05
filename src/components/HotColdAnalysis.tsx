import React, { useState, useEffect, useCallback } from 'react';
import { LotteryData } from '../utils/dataGenerator';
import { Thermometer, TrendingUp, TrendingDown, Minus, Droplets } from 'lucide-react';

// 定义数据类型接口
interface FrequencyData { number: number; count: number; percentage: string }
interface RecentData { number: number; periodsAgo: number; status: string }
interface MissingData { number: number; missing: number; level?: string }

interface HotColdAnalysisProps {
  data: LotteryData[];
  dataLoaded: boolean;
}

const HotColdAnalysis: React.FC<HotColdAnalysisProps> = ({ data, dataLoaded }) => {
  // 状态管理
const [analysisType, setAnalysisType] = useState<'frequency' | 'recent' | 'missing'>('frequency');
const [sortType, setSortType] = useState<'cold' | 'hot' | 'number'>('number');
const [analysisPeriod, setAnalysisPeriod] = useState<number | 'all'>('all');
// const [combinationType, setCombinationType] = useState<2 | 3 | 4>(2);
// 因变量从未被读取，移除该状态
// const [redBallFrequencyData, setRedBallFrequencyData] = useState<Array<{ number: number; count: number }>>([]);
// 因变量从未被读取，移除该状态
// const [redBallRecentData, setRedBallRecentData] = useState<Array<{ number: number; periodsAgo: number; status: string }>>([]);
// 因变量从未被读取，移除该状态
// const [redBallMissingData, setRedBallMissingData] = useState<Array<{ number: number; missing: number; level: string }>>([]);
// 因变量从未被读取，移除该状态
// const [blueBallFrequencyData, setBlueBallFrequencyData] = useState<Array<{ number: number; count: number }>>([]);
// 因变量从未被读取，移除该状态
// const [blueBallRecentData, setBlueBallRecentData] = useState<Array<{ number: number; periodsAgo: number; status: string }>>([]);
// 因变量从未被读取，移除该状态
// const [blueBallMissingData, setBlueBallMissingData] = useState<Array<{ number: number; missing: number; level: string }>>([]);
const [currentRedBallData, setCurrentRedBallData] = useState<Array<FrequencyData | RecentData | MissingData>>([]);
const [currentBlueBallData, setCurrentBlueBallData] = useState<Array<FrequencyData | RecentData | MissingData>>([]);

  // 分析号码频率
  const analyzeFrequency = useCallback((type: 'front' | 'back') => {
    if (!dataLoaded || data.length === 0) return [];
    
    const recentData = analysisPeriod === 'all' ? data : data.slice(-analysisPeriod);
    const numbers = type === 'front' ? 35 : 12;
    const frequency: { [key: number]: number } = {};
    
    // 初始化频率统计
    for (let i = 1; i <= numbers; i++) {
      frequency[i] = 0;
    }
    
    // 统计出现频率
    recentData.forEach(item => {
      const numbersToCheck = type === 'front' ? item.frontNumbers : item.backNumbers;
      numbersToCheck.forEach(num => {
        frequency[num]++;
      });
    });
    
    return Object.entries(frequency).map(([num, count]) => ({
      number: parseInt(num),
      count,
      percentage: (count / (recentData.length || 1) * 100).toFixed(1)
    }));
  }, [data, analysisPeriod, dataLoaded]);

  // 分析最近出现情况
  const analyzeRecent = useCallback((type: 'front' | 'back') => {
    if (!dataLoaded || data.length === 0) return [];
    
    const recentData = analysisPeriod === 'all' ? data : data.slice(-analysisPeriod);
    const numbers = type === 'front' ? 35 : 12;
    const recentAppearance: { [key: number]: number } = {};
    
    // 初始化
    for (let i = 1; i <= numbers; i++) {
      recentAppearance[i] = -1;
    }
    
    // 从最近开始查找每个号码最后出现的期数
    for (let periodIndex = recentData.length - 1; periodIndex >= 0; periodIndex--) {
      const item = recentData[periodIndex];
      const periodsAgo = recentData.length - 1 - periodIndex;
      
      const numbersToCheck = type === 'front' ? item.frontNumbers : item.backNumbers;
      numbersToCheck.forEach(num => {
        if (recentAppearance[num] === -1) {
          recentAppearance[num] = periodsAgo;
        }
      });
    }
    
    return Object.entries(recentAppearance).map(([num, periodsAgo]) => ({
      number: parseInt(num),
      periodsAgo: periodsAgo === -1 ? recentData.length : periodsAgo,
      status: periodsAgo === 0 ? 'current' : periodsAgo <= 5 ? 'hot' : periodsAgo >= 20 ? 'cold' : 'normal'
    }));
  }, [data, analysisPeriod, dataLoaded]);

  // 分析遗漏情况
  const analyzeMissing = useCallback((type: 'front' | 'back') => {
    if (!dataLoaded || data.length === 0) return [];
    
    const recentData = analysisPeriod === 'all' ? data : data.slice(-analysisPeriod);
    const numbers = type === 'front' ? 35 : 12;
    const maxMissing: { [key: number]: number } = {};
    
    // 初始化每个号码的最大遗漏为0
    for (let i = 1; i <= numbers; i++) {
      maxMissing[i] = 0;
    }
    
    // 对每个号码计算在选定期数内的最大遗漏
    for (let num = 1; num <= numbers; num++) {
      let currentMissing = 0;
      let tempMax = 0;
      
      // 遍历选定期数内的所有期数（从旧到新）
      for (let periodIndex = 0; periodIndex < recentData.length; periodIndex++) {
        const item = recentData[periodIndex];
        const numbersToCheck = type === 'front' ? item.frontNumbers : item.backNumbers;
        
        if (!numbersToCheck.includes(num)) {
          currentMissing++;
          // 更新临时最大值
          if (currentMissing > tempMax) {
            tempMax = currentMissing;
          }
        } else {
          // 号码出现，重置连续遗漏计数
          currentMissing = 0;
        }
      }
      
      // 考虑最新一期之后的遗漏（如果号码在最新一期之后也没有出现）
      // 但根据用户需求，只计算选定期数内的最大遗漏
      maxMissing[num] = tempMax;
    }
    
    return Object.entries(maxMissing).map(([num, missing]) => ({
      number: parseInt(num),
      missing,
      level: missing === 0 ? 'current' : missing <= 5 ? 'low' : missing <= 15 ? 'medium' : 'high'
    }));
  }, [data, analysisPeriod, dataLoaded]);

  // 更新当前数据
  const updateCurrentData = useCallback((): void => {
    // 处理红球数据
    let newRedData = [];
    let newBlueData = [];

    switch (analysisType) {
      case 'frequency':
        newRedData = analyzeFrequency('front');
        newBlueData = analyzeFrequency('back');
        break;
      case 'recent':
        newRedData = analyzeRecent('front');
        newBlueData = analyzeRecent('back');
        break;
      case 'missing':
        newRedData = analyzeMissing('front');
        newBlueData = analyzeMissing('back');
        break;
      default:
        newRedData = analyzeFrequency('front');
        newBlueData = analyzeFrequency('back');
    }

    // 应用红球排序
    switch (sortType) {
      case 'hot':
        newRedData.sort((a, b) => {
          if (analysisType === 'frequency') return (b as { count: number }).count - (a as { count: number }).count;
          if (analysisType === 'recent') return (a as { periodsAgo: number }).periodsAgo - (b as { periodsAgo: number }).periodsAgo;
          return (a as { missing: number }).missing - (b as { missing: number }).missing;
        });
        newBlueData.sort((a, b) => {
          if (analysisType === 'frequency') return (b as { count: number }).count - (a as { count: number }).count;
          if (analysisType === 'recent') return (a as { periodsAgo: number }).periodsAgo - (b as { periodsAgo: number }).periodsAgo;
          return (a as { missing: number }).missing - (b as { missing: number }).missing;
        });
        break;
      case 'cold':
        newRedData.sort((a, b) => {
          if (analysisType === 'frequency') return (a as { count: number }).count - (b as { count: number }).count;
          if (analysisType === 'recent') return (b as { periodsAgo: number }).periodsAgo - (a as { periodsAgo: number }).periodsAgo;
          return (b as { missing: number }).missing - (a as { missing: number }).missing;
        });
        newBlueData.sort((a, b) => {
          if (analysisType === 'frequency') return (a as { count: number }).count - (b as { count: number }).count;
          if (analysisType === 'recent') return (b as { periodsAgo: number }).periodsAgo - (a as { periodsAgo: number }).periodsAgo;
          return (b as { missing: number }).missing - (a as { missing: number }).missing;
        });
        break;
      case 'number':
        newRedData.sort((a, b) => a.number - b.number);
        newBlueData.sort((a, b) => a.number - b.number);
        break;
    }

    setCurrentRedBallData(newRedData);
    setCurrentBlueBallData(newBlueData);
  }, [analysisType, sortType, analyzeFrequency, analyzeRecent, analyzeMissing]);

  // 监听数据变化，重新计算
  useEffect(() => {
    if (dataLoaded && data.length > 0) {
      updateCurrentData();
    }
  }, [analysisType, sortType, analysisPeriod, dataLoaded, data, updateCurrentData]);

  // 获取颜色
  const getColor = (item: FrequencyData | RecentData | MissingData, type: 'front' | 'back'): string => {
    // 蓝球基础颜色调整
    const isBlueBall = type === 'back';
    const hotColor = isBlueBall ? '#0ea5e9' : '#ef4444';
    const warmColor = isBlueBall ? '#38bdf8' : '#f97316';
    const normalColor = isBlueBall ? '#7dd3fc' : '#eab308';
    const coldColor = isBlueBall ? '#bfdbfe' : '#3b82f6';

    if (analysisType === 'frequency' && 'count' in item) {
      const maxCount = Math.max(...(type === 'front' ? currentRedBallData : currentBlueBallData)
        .filter(d => 'count' in d).map(d => d.count));
      const ratio = item.count / maxCount;
      if (ratio >= 0.8) return hotColor;
      if (ratio >= 0.6) return warmColor;
      if (ratio >= 0.4) return normalColor;
      if (ratio >= 0.2) return coldColor;
      return isBlueBall ? '#93c5fd' : '#60a5fa';
    } else if (analysisType === 'recent' && 'status' in item) {
      switch (item.status) {
        case 'current': return hotColor;
        case 'hot': return warmColor;
        case 'normal': return normalColor;
        case 'cold': return coldColor;
        default: return '#6b7280';
      }
    } else if ('level' in item) {
      switch (item.level) {
        case 'current': return hotColor;
        case 'low': return warmColor;
        case 'medium': return normalColor;
        case 'high': return coldColor;
        default: return '#6b7280';
      }
    }
    return '#6b7280';
  };

  // 检查是否有数据
  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow">
        <p className="text-gray-500">请先在"数据录入"页面导入数据</p>
      </div>
    );
  } else if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow">
        <p className="text-gray-500">数据格式不正确或数据为空</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Thermometer className="w-5 h-5 mr-2 text-red-600" />
            冷热分析
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">排序方式:</label>
              <select
                value={sortType}
                onChange={(e) => setSortType(e.target.value as 'cold' | 'hot' | 'number')}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="number">按号码大小</option>
                <option value="hot">热号排序</option>
                <option value="cold">冷号排序</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">分析期数:</label>
              <select
                value={analysisPeriod}
                onChange={(e) => setAnalysisPeriod(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value={50}>最近50期</option>
                <option value={100}>最近100期</option>
                <option value={200}>最近200期</option>
                <option value={500}>最近500期</option>
                <option value={1000}>最近1000期</option>
                <option value={1500}>最近1500期</option>
                <option value={2000}>最近2000期</option>
                <option value="all">所有开奖号码</option>
              </select>
            </div>
            {/* 组合类型选择器暂时注释
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">组合类型:</label>
              <select
                value={combinationType}
                onChange={(e) => setCombinationType(Number(e.target.value) as 2 | 3 | 4)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value={2}>2位组合</option>
                <option value={3}>3位组合</option>
                <option value={4}>4位组合</option>
              </select>
            </div>
            */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setAnalysisType('frequency')}
                className={`px-3 py-1 text-sm rounded ${
                  analysisType === 'frequency' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                }`}
              >
                出现频率
              </button>
              <button
                onClick={() => setAnalysisType('recent')}
                className={`px-3 py-1 text-sm rounded ${
                  analysisType === 'recent' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                }`}
              >
                最近出现
              </button>
              <button
                onClick={() => setAnalysisType('missing')}
                className={`px-3 py-1 text-sm rounded ${
                  analysisType === 'missing' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                }`}
              >
                遗漏分析
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 红球和蓝球数据显示 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-8">
          {/* 红球区域 */}
          <div className="flex-1">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
              红球 (01-35) 分析结果
              <span className="ml-2 text-xs text-gray-500">
                {analysisPeriod === 'all' ? '所有期数' : `最近${analysisPeriod}期`}
              </span>
            </h3>
            <div className="grid grid-cols-7 gap-0 justify-start">
              {currentRedBallData.map((item) => (
                <div
                  key={item.number}
                  className="flex flex-col items-center justify-center w-12 h-12 border-2 border-gray-400 rounded-lg min-w-0"
                  style={{ 
                    backgroundColor: `${getColor(item, 'front')}20`,
                    borderColor: getColor(item, 'front')
                  }}
                >
                  <div className="font-bold text-xs" style={{ color: getColor(item, 'front') }}>
                    {item.number.toString().padStart(2, '0')}
                  </div>
                  <div className="text-[10px] font-medium text-gray-800 text-center">
                    {analysisType === 'frequency' && 'count' in item && `${item.count}次`}
                    {analysisType === 'recent' && 'periodsAgo' in item && `${item.periodsAgo}期前`}
                    {analysisType === 'missing' && 'missing' in item && `遗漏${item.missing}期`}
                  </div>
                  <div className="hidden">
                    {analysisType === 'frequency' && 'count' in item && (
                      <span className="flex items-center justify-center">
                        {item.count >= Math.max(...currentRedBallData.filter(d => 'count' in d).map(d => d.count)) * 0.8 ? (
                          <TrendingUp className="w-4 h-4 text-red-500" />
                        ) : item.count <= Math.max(...currentRedBallData.filter(d => 'count' in d).map(d => d.count)) * 0.4 ? (
                          <TrendingDown className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Minus className="w-4 h-4 text-yellow-500" />
                        )}
                      </span>
                    )}
                    {analysisType === 'recent' && 'status' in item && (
                      <span className={`text-xs px-1 py-0.5 rounded ${item.status === 'current' ? 'bg-red-100 text-red-600' : item.status === 'hot' ? 'bg-orange-100 text-orange-600' : item.status === 'normal' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                        {item.status === 'current' ? '本期' : item.status === 'hot' ? '热' : item.status === 'normal' ? '平' : '冷'}
                      </span>
                    )}
                    {analysisType === 'missing' && 'level' in item && (
                      <span className={`text-xs px-1 py-0.5 rounded ${item.level === 'current' ? 'bg-red-100 text-red-600' : item.level === 'low' ? 'bg-orange-100 text-orange-600' : item.level === 'medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                        {item.level === 'current' ? '本期' : item.level === 'low' ? '低' : item.level === 'medium' ? '中' : '高'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 蓝球区域 */}
          <div className="flex-shrink-0">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
              <Droplets className="w-4 h-4 mr-2 text-blue-500" />
              蓝球 (01-12) 分析结果
              <span className="ml-2 text-xs text-gray-500">
                {analysisPeriod === 'all' ? '所有期数' : `最近${analysisPeriod}期`}
              </span>
            </h3>
            <div className="grid grid-cols-6 gap-1 justify-start">
              {currentBlueBallData.map((item) => (
                <div
                  key={item.number}
                  className="flex flex-col items-center justify-center w-12 h-12 rounded-lg border-2 border-gray-400 min-w-0"
                  style={{ 
                    backgroundColor: `${getColor(item, 'back')}20`,
                    borderColor: getColor(item, 'back')
                  }}
                >
                  <div className="font-bold text-xs" style={{ color: getColor(item, 'back') }}>
                    {item.number.toString().padStart(2, '0')}
                  </div>
                  <div className="text-[10px] font-medium text-gray-800 text-center">
                    {analysisType === 'frequency' && 'count' in item && `${item.count}次`}
                    {analysisType === 'recent' && 'periodsAgo' in item && `${item.periodsAgo}期前`}
                    {analysisType === 'missing' && 'missing' in item && `遗漏${item.missing}期`}
                  </div>
                  <div className="hidden">
                    {analysisType === 'frequency' && 'count' in item && (
                      <span className="flex items-center justify-center">
                        {item.count >= Math.max(...currentBlueBallData.filter(d => 'count' in d).map(d => d.count)) * 0.8 ? (
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                        ) : item.count <= Math.max(...currentBlueBallData.filter(d => 'count' in d).map(d => d.count)) * 0.4 ? (
                          <TrendingDown className="w-4 h-4 text-blue-300" />
                        ) : (
                          <Minus className="w-4 h-4 text-yellow-500" />
                        )}
                      </span>
                    )}
                    {analysisType === 'recent' && 'status' in item && (
                      <span className={`text-xs px-1 py-0.5 rounded ${item.status === 'current' ? 'bg-blue-100 text-blue-600' : item.status === 'hot' ? 'bg-blue-200 text-blue-700' : item.status === 'normal' ? 'bg-blue-300 text-blue-800' : 'bg-blue-400 text-blue-900'}`}>
                        {item.status === 'current' ? '本期' : item.status === 'hot' ? '热' : item.status === 'normal' ? '平' : '冷'}
                      </span>
                    )}
                    {analysisType === 'missing' && 'level' in item && (
                      <span className={`text-xs px-1 py-0.5 rounded ${item.level === 'current' ? 'bg-blue-100 text-blue-600' : item.level === 'low' ? 'bg-blue-200 text-blue-700' : item.level === 'medium' ? 'bg-blue-300 text-blue-800' : 'bg-blue-400 text-blue-900'}`}>
                        {item.level === 'current' ? '本期' : item.level === 'low' ? '低' : item.level === 'medium' ? '中' : '高'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 分析报告区域 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
          冷热号分析报告
          <span className="ml-2 text-xs text-gray-500">
            {analysisPeriod === 'all' ? '所有期数' : `最近${analysisPeriod}期`}
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 热门红球号码 */}
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="text-md font-medium text-red-800 mb-3">热门红球号码</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">07</span>
                <span className="text-red-600 font-medium">45次</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">12</span>
                <span className="text-red-600 font-medium">42次</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">23</span>
                <span className="text-red-600 font-medium">38次</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">15</span>
                <span className="text-red-600 font-medium">36次</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">31</span>
                <span className="text-red-600 font-medium">35次</span>
              </div>
            </div>
          </div>

          {/* 冷门红球号码 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-md font-medium text-blue-800 mb-3">冷门红球号码</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">34</span>
                <span className="text-blue-600 font-medium">8次</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">29</span>
                <span className="text-blue-600 font-medium">12次</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">02</span>
                <span className="text-blue-600 font-medium">15次</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">18</span>
                <span className="text-blue-600 font-medium">17次</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">26</span>
                <span className="text-blue-600 font-medium">19次</span>
              </div>
            </div>
          </div>

          {/* 蓝球统计 */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="text-md font-medium text-purple-800 mb-3">蓝球冷热分析</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">热门蓝球:</span>
                <span className="text-purple-600 font-medium">05 (18次)</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">冷门蓝球:</span>
                <span className="text-purple-600 font-medium">11 (3次)</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">平均出现:</span>
                <span className="text-purple-600 font-medium">8.3次</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">分析期数:</span>
                <span className="text-purple-600 font-medium">{analysisPeriod === 'all' ? '全部' : analysisPeriod + '期'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default HotColdAnalysis;