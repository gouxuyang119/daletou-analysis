import React, { useState, useMemo } from 'react';
import { LotteryData } from '../utils/dataGenerator';
import { Target, Calendar } from 'lucide-react';

interface StatisticsPanelProps {
  data: LotteryData[];
  dataLoaded: boolean;
  onError?: (message: string) => void;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ data, dataLoaded }) => {
  const [totalPeriods, setTotalPeriods] = useState(200);
  const [displayPeriods, setDisplayPeriods] = useState(30);
  const [selectedArea, setSelectedArea] = useState<'front' | 'back'>('front');

  // 获取最近期数的数据 - 与TrendChart保持完全一致的数据处理逻辑
  const recentData = useMemo(() => {
    if (!dataLoaded || data.length === 0) return [];
    
    // 先按期号排序（从小到大）
    const sortedData = [...data].sort((a, b) => a.issue.localeCompare(b.issue));
    
    // 取指定的总期数
    const maxPeriods = Math.min(totalPeriods, sortedData.length, 5000);
    const totalData = sortedData.slice(-maxPeriods);
    
    // 再取显示期数
    const maxDisplayPeriods = Math.min(displayPeriods, totalData.length);
    const displayData = totalData.slice(-maxDisplayPeriods);
    
    return displayData;
  }, [data, dataLoaded, totalPeriods, displayPeriods]);

  // 计算每期的统计数据
  const periodAnalysis = useMemo(() => {
    return recentData.map((item) => {
      const numbers = selectedArea === 'front' ? item.frontNumbers : item.backNumbers;
      
      // 计算和值
      const sum = numbers.reduce((acc, num) => acc + num, 0);
      
      // 计算奇偶分布
      const oddCount = numbers.filter(num => num % 2 === 1).length;
      const evenCount = numbers.length - oddCount;
      const oddEvenPattern = `${oddCount}:${evenCount}`;
      
      // 计算跨度
      const span = Math.max(...numbers) - Math.min(...numbers);
      
      // 计算大小比
      const maxNum = selectedArea === 'front' ? 35 : 12;
      const midPoint = Math.ceil(maxNum / 2);
      const bigCount = numbers.filter(num => num > midPoint).length;
      const smallCount = numbers.length - bigCount;
      const bigSmallPattern = `${bigCount}:${smallCount}`;
      
      // 计算质合比
      const isPrime = (num: number) => {
        if (num < 2) return false;
        for (let i = 2; i <= Math.sqrt(num); i++) {
          if (num % i === 0) return false;
        }
        return true;
      };
      const primeCount = numbers.filter(isPrime).length;
      const compositeCount = numbers.length - primeCount;
      const primeCompositePattern = `${primeCount}:${compositeCount}`;
      
      return {
        period: item.period,
        issue: item.issue,
        numbers: numbers.sort((a, b) => a - b),
        sum,
        oddEvenPattern,
        span,
        bigSmallPattern,
        primeCompositePattern,
        oddCount,
        evenCount,
        bigCount,
        smallCount,
        primeCount,
        compositeCount
      };
    });
  }, [recentData, selectedArea]);

  // 计算统计概览
  const statisticsOverview = useMemo(() => {
    if (periodAnalysis.length === 0) return null;
    
    const sums = periodAnalysis.map(p => p.sum);
    const spans = periodAnalysis.map(p => p.span);
    
    return {
      totalPeriods: periodAnalysis.length,
      avgSum: (sums.reduce((a, b) => a + b, 0) / sums.length).toFixed(1),
      maxSum: Math.max(...sums),
      minSum: Math.min(...sums),
      avgSpan: (spans.reduce((a, b) => a + b, 0) / spans.length).toFixed(1),
      maxSpan: Math.max(...spans),
      minSpan: Math.min(...spans)
    };
  }, [periodAnalysis]);



  // 添加数据验证 - 与TrendChart保持一致
  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow">
        <p className="text-gray-500">请先在"数据录入"页面导入数据</p>
      </div>
    );
  } else if (recentData.length === 0) {
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Target className="w-5 h-5 mr-2 text-green-600" />
            统计分析
          </h2>
          <div className="flex items-center space-x-4">
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value as 'front' | 'back')}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="front">前区分析</option>
              <option value="back">后区分析</option>
            </select>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">总期数:</label>
                <select
                  value={totalPeriods}
                  onChange={(e) => setTotalPeriods(Number(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  <option value={100}>100期</option>
                  <option value={200}>200期</option>
                  <option value={500}>500期</option>
                  <option value={1000}>1000期</option>
                  <option value={2000}>2000期</option>
                  <option value={5000}>5000期</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">显示期数:</label>
                <select
                  value={displayPeriods}
                  onChange={(e) => setDisplayPeriods(Number(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  <option value={10}>最近10期</option>
                  <option value={20}>最近20期</option>
                  <option value={30}>最近30期</option>
                  <option value={50}>最近50期</option>
                  <option value={100}>最近100期</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 统计概览 */}
        {statisticsOverview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm text-blue-600">分析期数</div>
              <div className="text-xl font-bold text-blue-700">{statisticsOverview.totalPeriods}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-sm text-green-600">平均和值</div>
              <div className="text-xl font-bold text-green-700">{statisticsOverview.avgSum}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-sm text-red-600">最大和值</div>
              <div className="text-xl font-bold text-red-700">{statisticsOverview.maxSum}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-sm text-purple-600">平均跨度</div>
              <div className="text-xl font-bold text-purple-700">{statisticsOverview.avgSpan}</div>
            </div>
          </div>
        )}
      </div>

      {/* 每期数据分析表格 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          每期数据分析
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {/* 第一行表头：红球/蓝球标识 */}
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border" rowSpan={2}>期号</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border" rowSpan={2}>开奖号码</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-red-600 uppercase tracking-wider border" colSpan={5}>红球</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-blue-600 uppercase tracking-wider border" colSpan={5}>蓝球</th>
              </tr>
              {/* 第二行表头：具体统计项 */}
              <tr>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">和值</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">奇偶比</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">大小比</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">质合比</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">跨度</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">和值</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">奇偶比</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">大小比</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">质合比</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">跨度</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {periodAnalysis.map((item, index) => {
                const currentData = recentData.find(d => d.issue === item.issue);
                const frontNumbers = currentData?.frontNumbers || [];
                const backNumbers = currentData?.backNumbers || [];
                
                // 计算红球统计
                const frontSum = frontNumbers.reduce((sum, num) => sum + num, 0);
                const frontOdd = frontNumbers.filter(num => num % 2 === 1).length;
                const frontEven = frontNumbers.length - frontOdd;
                const frontBig = frontNumbers.filter(num => num > 17).length;
                const frontSmall = frontNumbers.length - frontBig;
                const frontPrime = frontNumbers.filter(num => [2,3,5,7,11,13,17,19,23,29,31].includes(num)).length;
                const frontComposite = frontNumbers.length - frontPrime;
                const frontSpan = frontNumbers.length > 0 ? Math.max(...frontNumbers) - Math.min(...frontNumbers) : 0;
                
                // 计算蓝球统计
                const backSum = backNumbers.reduce((sum, num) => sum + num, 0);
                const backOdd = backNumbers.filter(num => num % 2 === 1).length;
                const backEven = backNumbers.length - backOdd;
                const backBig = backNumbers.filter(num => num > 6).length;
                const backSmall = backNumbers.length - backBig;
                const backPrime = backNumbers.filter(num => [2,3,5,7,11].includes(num)).length;
                const backComposite = backNumbers.length - backPrime;
                const backSpan = backNumbers.length > 0 ? Math.max(...backNumbers) - Math.min(...backNumbers) : 0;
                
                return (
                  <tr key={item.period} className={`hover:bg-gray-50 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-blue-600 border">
                      {item.issue}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm border">
                      <div className="flex justify-start items-center space-x-0.5">
                        {/* 红球号码 */}
                        <div className="flex items-center space-x-0.5">
                          {frontNumbers.map((num, idx) => (
                            <div
                              key={`front-${idx}`}
                              className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center font-bold"
                              style={{ fontSize: '8px' }}
                            >
                              {num.toString().padStart(2, '0')}
                            </div>
                          ))}
                        </div>
                        {/* 分隔符 */}
                        <span className="mx-1 text-gray-400 text-xs">+</span>
                        {/* 蓝球号码 */}
                        <div className="flex items-center space-x-0.5">
                          {backNumbers.map((num, idx) => (
                            <div
                              key={`back-${idx}`}
                              className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold"
                              style={{ fontSize: '8px' }}
                            >
                              {num.toString().padStart(2, '0')}
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                    {/* 红球统计数据 */}
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-center border">{frontSum}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-center border">{frontOdd}:{frontEven}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-center border">{frontBig}:{frontSmall}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-center border">{frontPrime}:{frontComposite}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-center border">{frontSpan}</td>
                    {/* 蓝球统计数据 */}
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-center border">{backSum}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-center border">{backOdd}:{backEven}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-center border">{backBig}:{backSmall}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-center border">{backPrime}:{backComposite}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-center border">{backSpan}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPanel;