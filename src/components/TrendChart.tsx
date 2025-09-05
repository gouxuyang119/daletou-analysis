import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';
import { LotteryData } from '../utils/dataGenerator';
// 由于 'format' 已声明但从未使用，移除该导入

interface TrendChartProps {
  data: LotteryData[];
  dataLoaded: boolean;
  onError?: (error: string) => void;
  targetIssue?: string;
}

const TrendChart: React.FC<TrendChartProps> = ({ data, dataLoaded, targetIssue }) => {
  // 只保留显示期数的状态管理
  const [displayPeriods, setDisplayPeriods] = useState(() => {
    try {
      const saved = localStorage.getItem('trendChart_displayPeriods');
      return saved ? parseInt(saved) : 100;
    } catch {
      return 100;
    }
  });
  
  const [customDisplayPeriods, setCustomDisplayPeriods] = useState(() => {
    try {
      const saved = localStorage.getItem('trendChart_displayPeriods');
      return saved ? saved : '100';
    } catch {
      return '100';
    }
  });
  
  const [highlightIssue, setHighlightIssue] = useState<string>('');

  // 保存显示期数到localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('trendChart_displayPeriods', displayPeriods.toString());
    } catch (error) {
      console.log('Failed to save displayPeriods to localStorage:', error);
    }
  }, [displayPeriods]);

  const tableRef = useRef<HTMLDivElement>(null);
  const targetRowRef = useRef<HTMLTableRowElement>(null);

  // 使用 useMemo 缓存数据，总期数使用全部上传数据
  const recentData = useMemo(() => {
    if (!dataLoaded || !data || data.length === 0) return [];
    
    // 先按期号排序（从小到大）
    const sortedData = [...data].sort((a, b) => a.issue.localeCompare(b.issue));
    
    // 如果有目标期号，显示目标期号前后50期的数据
    if (targetIssue) {
      const targetIndex = sortedData.findIndex(item => item.issue === targetIssue);
      if (targetIndex !== -1) {
        // 计算前后50期的范围
        const startIndex = Math.max(0, targetIndex - 50);
        const endIndex = Math.min(sortedData.length, targetIndex + 51); // +51是因为包含目标期号本身
        return sortedData.slice(startIndex, endIndex);
      }
    }
    
    // 总期数就是全部数据的长度
    const totalData = sortedData;
    
    // 限制显示期数最大值，避免渲染过多数据导致卡顿
    const maxDisplayPeriods = Math.min(displayPeriods, totalData.length, 200); // 进一步限制最大显示期数为200
    const displayData = totalData.slice(-maxDisplayPeriods);
    
    return displayData;
  }, [data, dataLoaded, displayPeriods, targetIssue]);

  // 当接收到目标期号时，自动定位并高亮显示
  useEffect(() => {
    if (targetIssue && data.length > 0) {
      const targetIndex = data.findIndex(item => item.issue === targetIssue);
      if (targetIndex !== -1) {
        // 设置显示期数为100期（目标期号前后50期）
        setDisplayPeriods(100);
        setHighlightIssue(targetIssue);
        
        // 3秒后清除高亮
        setTimeout(() => setHighlightIssue(''), 3000);
      }
    } else if (!targetIssue) {
      // 如果没有目标期号，清除高亮
      setHighlightIssue('');
    }
  }, [targetIssue, data]);

  // 滚动到目标期号位置
  useEffect(() => {
    if (targetIssue && recentData.length > 0 && targetRowRef.current && tableRef.current) {
      // 延迟执行滚动，确保DOM已更新
      setTimeout(() => {
        if (targetRowRef.current && tableRef.current) {
          const targetRow = targetRowRef.current;
          const tableContainer = tableRef.current;
          
          // 计算目标行相对于容器的位置
          const targetRowTop = targetRow.offsetTop;
          const containerHeight = tableContainer.clientHeight;
          const targetRowHeight = targetRow.clientHeight;
          
          // 滚动到目标行，使其居中显示
          const scrollTop = targetRowTop - (containerHeight / 2) + (targetRowHeight / 2);
          
          tableContainer.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [targetIssue, recentData]);



  // 计算号码的遗漏期数（修正逻辑：当前期出现了，下一期没有出，下一期记录1）
  const calculateMissingPeriods = (number: number, area: 'front' | 'back', currentIndex: number, dataArray: LotteryData[]) => {
    if (!dataArray || currentIndex >= dataArray.length || currentIndex < 0) {
      return 0;
    }

    const currentItem = dataArray[currentIndex];
    if (!currentItem) {
      return 0;
    }
    
    const currentNumbers = area === 'front' ? currentItem.frontNumbers : currentItem.backNumbers;
    
    // 如果当前期包含该号码，返回0（不显示遗漏）
    if (currentNumbers.includes(number)) {
      return 0;
    }
    
    // 向前查找该号码最后一次出现的位置
    let lastAppearIndex = -1;
    for (let i = currentIndex - 1; i >= 0; i--) {
      const item = dataArray[i];
      if (!item) continue;
      const numbers = area === 'front' ? item.frontNumbers : item.backNumbers;
      if (numbers.includes(number)) {
        lastAppearIndex = i;
        break;
      }
    }
    
    // 如果找到了最后出现的位置，计算遗漏期数
    if (lastAppearIndex !== -1) {
      return currentIndex - lastAppearIndex;
    }
    
    // 如果在当前范围内没有找到，返回当前索引+1
    return currentIndex + 1;
  };

  // 检查号码是否连续出现3期以上
  const isConsecutiveHot = (number: number, area: 'front' | 'back', currentIndex: number, dataArray: LotteryData[]) => {
    if (!dataArray || currentIndex >= dataArray.length || currentIndex < 0) {
      return false;
    }
    
    let consecutiveCount = 0;
    
    // 从当前期开始向后检查连续出现
    for (let i = currentIndex; i < dataArray.length; i++) {
      const item = dataArray[i];
      if (!item) break;
      const numbers = area === 'front' ? item.frontNumbers : item.backNumbers;
      if (numbers.includes(number)) {
        consecutiveCount++;
      } else {
        break;
      }
    }
    
    // 向前检查连续出现
    for (let i = currentIndex - 1; i >= 0; i--) {
      const item = dataArray[i];
      if (!item) break;
      const numbers = area === 'front' ? item.frontNumbers : item.backNumbers;
      if (numbers.includes(number)) {
        consecutiveCount++;
      } else {
        break;
      }
    }
    
    return consecutiveCount >= 3;
  };

  // 检查是否有3个以上连号（相邻号码同时出现）
  const hasConsecutiveNumbers = (numbers: number[]) => {
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    let consecutiveCount = 1;
    
    for (let i = 1; i < sortedNumbers.length; i++) {
      if (sortedNumbers[i] === sortedNumbers[i-1] + 1) {
        consecutiveCount++;
        if (consecutiveCount >= 3) return true;
      } else {
        consecutiveCount = 1;
      }
    }
    return false;
  };

  // 检查号码是否是连号的一部分
  const isPartOfConsecutive = (number: number, numbers: number[]) => {
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    const index = sortedNumbers.indexOf(number);
    if (index === -1) return false;
    
    let consecutiveCount = 1;
    
    // 向前检查
    for (let i = index - 1; i >= 0; i--) {
      if (sortedNumbers[i] === sortedNumbers[i + 1] - 1) {
        consecutiveCount++;
      } else {
        break;
      }
    }
    
    // 向后检查
    for (let i = index + 1; i < sortedNumbers.length; i++) {
      if (sortedNumbers[i] === sortedNumbers[i - 1] + 1) {
        consecutiveCount++;
      } else {
        break;
      }
    }
    
    return consecutiveCount >= 3;
  };

  // 检查斜连号（斜着3连及以上）- 增强版本
  const isDiagonalConsecutive = (number: number, area: 'front' | 'back', currentIndex: number, dataArray: LotteryData[]) => {
    if (!dataArray || currentIndex >= dataArray.length || currentIndex < 0) {
      return false;
    }

    const maxNum = area === 'front' ? 35 : 12;
    
    // 检查四个方向的斜连号
    const directions = [
      { periodStep: 1, numberStep: 1 },   // 向前递增：期号↑，号码↑
      { periodStep: -1, numberStep: -1 }, // 向后递减：期号↓，号码↓
      { periodStep: 1, numberStep: -1 },  // 向前递减：期号↑，号码↓
      { periodStep: -1, numberStep: 1 }   // 向后递增：期号↓，号码↑
    ];
    
    for (const direction of directions) {
      let count = 1; // 包含当前期
      
      // 向一个方向检查
      for (let step = 1; step < 5; step++) {
        const targetIndex = currentIndex + (step * direction.periodStep);
        const targetNumber = number + (step * direction.numberStep);
        
        if (targetIndex < 0 || targetIndex >= dataArray.length || 
            targetNumber < 1 || targetNumber > maxNum) {
          break;
        }
        
        const item = dataArray[targetIndex];
        if (!item) break;
        
        const numbers = area === 'front' ? item.frontNumbers : item.backNumbers;
        if (numbers.includes(targetNumber)) {
          count++;
        } else {
          break;
        }
      }
      
      // 向相反方向检查
      for (let step = 1; step < 5; step++) {
        const targetIndex = currentIndex - (step * direction.periodStep);
        const targetNumber = number - (step * direction.numberStep);
        
        if (targetIndex < 0 || targetIndex >= dataArray.length || 
            targetNumber < 1 || targetNumber > maxNum) {
          break;
        }
        
        const item = dataArray[targetIndex];
        if (!item) break;
        
        const numbers = area === 'front' ? item.frontNumbers : item.backNumbers;
        if (numbers.includes(targetNumber)) {
          count++;
        } else {
          break;
        }
      }
      
      if (count >= 3) {
        return true;
      }
    }
    
    return false;
  };

  // 预计算所有号码状态，避免渲染时重复计算
  const precomputedStats = useMemo(() => {
    if (!recentData || recentData.length === 0) return new Map();
    
    const stats = new Map();
    
    // 为每个期号和号码预计算状态
    recentData.forEach((item, periodIndex) => {
      // 红球状态计算
      for (let num = 1; num <= 35; num++) {
        const key = `front-${periodIndex}-${num}`;
        const isSelected = item.frontNumbers.includes(num);
        const missingPeriods = isSelected ? 0 : calculateMissingPeriods(num, 'front', periodIndex, recentData);
        const isHot = isConsecutiveHot(num, 'front', periodIndex, recentData);
        const isConsecutivePart = isPartOfConsecutive(num, item.frontNumbers);
        const isDiagonal = isDiagonalConsecutive(num, 'front', periodIndex, recentData);
        
        stats.set(key, {
          isSelected,
          missingPeriods,
          isHot,
          isConsecutivePart,
          isDiagonal
        });
      }
      
      // 蓝球状态计算
      for (let num = 1; num <= 12; num++) {
        const key = `back-${periodIndex}-${num}`;
        const isSelected = item.backNumbers.includes(num);
        const missingPeriods = isSelected ? 0 : calculateMissingPeriods(num, 'back', periodIndex, recentData);
        const isHot = isConsecutiveHot(num, 'back', periodIndex, recentData);
        const isConsecutivePart = isPartOfConsecutive(num, item.backNumbers);
        const isDiagonal = isDiagonalConsecutive(num, 'back', periodIndex, recentData);
        
        stats.set(key, {
          isSelected,
          missingPeriods,
          isHot,
          isConsecutivePart,
          isDiagonal
        });
      }
    });
    
    return stats;
  }, [recentData]);

  // 计算总期数和起始结束期号
  const totalPeriods = data.length;
  const startIssue = recentData.length > 0 ? recentData[0].issue : '';
  const endIssue = recentData.length > 0 ? recentData[recentData.length - 1].issue : '';

  // 添加数据验证
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
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            走势分析
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <label className="text-sm text-gray-600">显示期数:</label>
              <div className="relative">
                <input
                  type="text"
                  value={customDisplayPeriods}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setCustomDisplayPeriods(value);
                  }}
                  onBlur={() => {
                    const value = parseInt(customDisplayPeriods) || 100;
                    const validValue = Math.min(200, Math.max(50, value)); // 限制最大显示期数为200
                    setDisplayPeriods(validValue);
                    setCustomDisplayPeriods(validValue.toString());
                  }}
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
        {/* 图例说明 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">图例说明</h4>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-5 h-5 bg-red-500 rounded-full"></div>
              <span>红球开奖号码</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-5 h-5 bg-red-800 rounded-full"></div>
              <span>红球连续3期以上/连号/斜连号</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-5 h-5 bg-blue-500 rounded-full"></div>
              <span>蓝球开奖号码</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-5 h-5 bg-blue-900 rounded-full"></div>
              <span>蓝球连续3期以上/连号/斜连号</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-5 h-5 bg-gray-200 border rounded text-center text-xs leading-5">5</div>
              <span>遗漏期数</span>
            </div>
          </div>
        </div>

        {/* 性能提示 */}
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="text-yellow-600 text-sm">💡 使用说明：</div>
            <div className="text-xs text-yellow-700">
              总期数自动使用全部上传数据，显示期数限制为200期以确保流畅体验。设置会自动保存。
            </div>
          </div>
          {totalPeriods > 1000 && (
            <div className="mt-2 text-xs text-orange-600">
              ⚠️ 检测到大量数据（{totalPeriods}期），已启用性能优化模式以确保流畅运行。
            </div>
          )}
        </div>

        {/* 数据统计 */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-blue-600">{totalPeriods}</div>
              <div className="text-gray-600">总期数</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-green-600">{displayPeriods}</div>
              <div className="text-gray-600">显示期数</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-purple-600">{startIssue}</div>
              <div className="text-gray-600">起始期号</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-orange-600">{endIssue}</div>
              <div className="text-gray-600">结束期号</div>
            </div>
          </div>
        </div>

        {/* 走势图表格 */}
      <div ref={tableRef} className="bg-gray-50 rounded-lg shadow overflow-auto max-h-[600px]">
        <table className="text-xs border-collapse w-full" style={{ fontSize: '10px' }}>
              <thead className="bg-white sticky top-0 z-[9999] border-b border-gray-200">
                {/* 第一行表头：红球/蓝球标识 */}
                <tr className="sticky top-0 z-[9999] bg-white">
                  <th className="px-0.5 py-0.5 text-xs font-bold text-black text-center border bg-white whitespace-nowrap" style={{ width: '32px', fontSize: '9px' }} rowSpan={3}>期号</th>
                   <th className="px-0.5 py-0.5 text-xs font-bold text-black text-center border border-r border-r-gray-400 bg-white whitespace-nowrap" style={{ width: '45px', fontSize: '9px' }} rowSpan={3}>开奖号码</th>
                  <th className="px-1 py-1 text-xs font-bold text-red-600 text-center border" colSpan={35}>红球</th>
                  <th className="px-1 py-1 text-xs font-bold text-blue-600 text-center border" colSpan={12}>蓝球</th>
                </tr>
                {/* 第二行表头：区域划分 */}
                <tr className="sticky top-[18px] z-[9999] bg-white">
                  <th className="px-1 py-1 text-xs font-bold text-red-600 text-center border" colSpan={7}>红一区</th>
                  <th className="px-1 py-1 text-xs font-bold text-red-600 text-center border" colSpan={7}>红二区</th>
                  <th className="px-1 py-1 text-xs font-bold text-red-600 text-center border" colSpan={7}>红三区</th>
                  <th className="px-1 py-1 text-xs font-bold text-red-600 text-center border" colSpan={7}>红四区</th>
                  <th className="px-1 py-1 text-xs font-bold text-red-600 text-center border" colSpan={7}>红五区</th>
                  <th className="px-1 py-1 text-xs font-bold text-blue-600 text-center border" colSpan={6}>蓝一区</th>
                  <th className="px-1 py-1 text-xs font-bold text-blue-600 text-center border" colSpan={6}>蓝二区</th>
                </tr>
                {/* 第三行表头：具体号码 */}
                <tr className="sticky top-[36px] z-[9999] bg-white">
                  {/* 红球表头 1-35 */}
                  {Array.from({ length: 35 }, (_, i) => i + 1).map(num => {
                    return (
                      <th key={`front-${num}`} className="px-0.5 py-0.5 text-xs font-bold text-red-600 text-center border bg-white" style={{ width: '8px', fontSize: '8px' }}>
                        {num.toString().padStart(2, '0')}
                      </th>
                    );
                  })}
                  {/* 蓝球表头 1-12 */}
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                    <th key={`back-${num}`} className="px-0.5 py-0.5 text-xs font-bold text-blue-600 text-center border bg-white" style={{ width: '8px', fontSize: '8px' }}>
                      {num.toString().padStart(2, '0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentData.map((item, periodIndex) => {
                  const frontHasConsecutive = hasConsecutiveNumbers(item.frontNumbers);
                  const backHasConsecutive = hasConsecutiveNumbers(item.backNumbers);
                  
                  return (
                    <tr 
                      key={item.period} 
                      ref={highlightIssue === item.issue ? targetRowRef : null}
                      className={`hover:bg-gray-50 ${highlightIssue === item.issue ? 'ring-4 ring-yellow-400 ring-opacity-75 bg-yellow-50' : ''}`}
                    >
                      {/* 期号 - 固定列 */}
                      <td className={`px-0.5 py-0.5 text-xs text-center border font-bold ${
                          highlightIssue === item.issue ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-50'
                        }`} style={{ width: '32px', fontSize: '9px' }}>
                          {item.issue}
                        </td>
                        
                       {/* 开奖号码 - 一行显示 */}
                       <td className="px-0.5 py-0.5 text-center border border-r border-r-gray-400 bg-gray-50" style={{ width: '45px' }}>
                        <div className="flex items-center justify-center gap-0.5 text-xs font-medium">
                          {item.frontNumbers.map((num, index) => (
                            <span key={`front-${index}`} className="w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center font-bold" style={{ fontSize: '7px' }}>
                              {num.toString().padStart(2, '0')}
                            </span>
                          ))}
                          {item.backNumbers.map((num, index) => (
                            <span key={`back-${index}`} className="w-3 h-3 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold" style={{ fontSize: '7px' }}>
                              {num.toString().padStart(2, '0')}
                            </span>
                          ))}
                        </div>
                      </td>
                      
                      {/* 红球号码位置 1-35 */}
                      {Array.from({ length: 35 }, (_, i) => i + 1).map(num => {
                        const statsKey = `front-${periodIndex}-${num}`;
                        const stats = precomputedStats.get(statsKey) || {
                          isSelected: false,
                          missingPeriods: 0,
                          isHot: false,
                          isConsecutivePart: false,
                          isDiagonal: false
                        };
                        const { isSelected, missingPeriods, isHot, isConsecutivePart, isDiagonal } = stats;
                        
                        let cellClass = "px-1 py-1 text-xs text-center border";
                        let content: React.ReactNode = "";
                        
                        // 根据号码区域设置不同的背景色
                        let bgColor = 'bg-gray-50'; // 默认背景
                        if (num >= 1 && num <= 7) bgColor = 'bg-red-50';      // 第1区域：浅红色
                        else if (num >= 8 && num <= 14) bgColor = 'bg-blue-50';   // 第2区域：浅蓝色
                        else if (num >= 15 && num <= 21) bgColor = 'bg-green-50'; // 第3区域：浅绿色
                        else if (num >= 22 && num <= 28) bgColor = 'bg-yellow-50'; // 第4区域：浅黄色
                        else if (num >= 29 && num <= 35) bgColor = 'bg-purple-50'; // 第5区域：浅紫色
                        
                        if (isSelected) {
                          // 当期开奖号码 - 只显示数字，背景透明
                          cellClass += ` ${bgColor}`;
                          if (isHot || (frontHasConsecutive && isConsecutivePart) || isDiagonal) {
                            content = (
                              <div className="w-3 h-3 bg-red-800 rounded-full flex items-center justify-center text-white font-bold mx-auto" style={{ fontSize: '6px' }}>
                                {num.toString().padStart(2, '0')}
                              </div>
                            );
                      
                          } else {
                            content = (
                              <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center text-white font-bold mx-auto" style={{ fontSize: '6px' }}>
                                {num.toString().padStart(2, '0')}
                              </div>     );
                          }
                        } else {
                          // 显示遗漏期数
                          cellClass += ` ${bgColor} text-gray-600`;
                          content = missingPeriods > 0 ? missingPeriods.toString() : "";
                        }
                        
                        return (
                             <td key={`front-${num}`} className={cellClass} style={{ width: '8px', height: '16px', fontSize: '8px' }}>
                               {content}
                             </td>
                           );
                      })}
                      
                      {/* 蓝球号码位置 1-12 */}
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(num => {
                        const statsKey = `back-${periodIndex}-${num}`;
                        const stats = precomputedStats.get(statsKey) || {
                          isSelected: false,
                          missingPeriods: 0,
                          isHot: false,
                          isConsecutivePart: false,
                          isDiagonal: false
                        };
                        const { isSelected, missingPeriods, isHot, isConsecutivePart, isDiagonal } = stats;
                        
                        let cellClass = "px-1 py-1 text-xs text-center border";
                        let content: React.ReactNode = "";
                        
                        // 根据位置设置不同的背景色：左边深蓝，右边浅蓝
                        const bgColor = num <= 6 ? 'bg-blue-200' : 'bg-blue-100';
                        
                        if (isSelected) {
                          // 当期开奖号码 - 只显示数字，背景透明
                          cellClass += ` ${bgColor}`;
                          if (isHot || (backHasConsecutive && isConsecutivePart) || isDiagonal) {
                            content = (
                              <div className="w-3 h-3 bg-blue-900 rounded-full flex items-center justify-center text-white font-bold mx-auto" style={{ fontSize: '6px' }}>
                                {num.toString().padStart(2, '0')}
                              </div>
                               );
                          } else {
                            content = (
                              <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mx-auto" style={{ fontSize: '6px' }}>
                                {num.toString().padStart(2, '0')}
                              </div>
                            );
                          }
                        } else {
                          // 显示遗漏期数
                          cellClass += ` ${bgColor} text-black`;
                          content = missingPeriods > 0 ? missingPeriods.toString() : "";
                        }
                        
                        return (
                            <td key={`back-${num}`} className={cellClass} style={{ width: '8px', height: '16px', fontSize: '8px' }}>
                              {content}
                            </td>
                          );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
          
          {/* 固定在底部的统计行 */}
          <div className="flex-shrink-0 bg-gray-50 border-t-2 border-gray-300">
            <table className="text-xs border-collapse w-full">
              <tbody>
                <tr>
                  <td className="px-0.5 py-0.5 text-xs font-medium text-center border bg-gray-50" style={{ width: '32px', fontSize: '9px' }}>统计</td>
                   <td className="px-0.5 py-0.5 text-xs text-center border border-r border-r-gray-400 font-bold bg-yellow-100" style={{ width: '45px' }}></td>
                  {/* 红球统计 */}
                  {Array.from({ length: 35 }, (_, i) => i + 1).map(num => {
                    const count = recentData.filter(item => item.frontNumbers.includes(num)).length;
                    return (
                      <td key={`front-stat-${num}`} className="px-0.5 py-0.5 text-xs text-center border font-medium text-red-600 bg-gray-50" style={{ width: '8px', lineHeight: '1.2', height: '36px', fontSize: '8px' }}>
                        <div>{count}</div>
                        <div className="text-red-500" style={{ fontSize: '10px' }}>
                          {count > 0 ? Math.round(displayPeriods / count) : displayPeriods}
                        </div>
                      </td>
                    );
                  })}
                  {/* 蓝球统计 */}
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(num => {
                    const count = recentData.filter(item => item.backNumbers.includes(num)).length;
                    return (
                      <td key={`back-stat-${num}`} className="px-0.5 py-0.5 text-xs text-center border font-medium text-blue-600 bg-gray-50" style={{ width: '8px', lineHeight: '1.2', height: '36px', fontSize: '8px' }}>
                        <div>{count}</div>
                        <div className="text-blue-500" style={{ fontSize: '10px' }}>
                          {count > 0 ? Math.round(displayPeriods / count) : displayPeriods}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
      </div>
    
      <div className="mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 分析摘要部分：包含红球热号、蓝球热号、红球冷号和斜连号分析 */}
        <div className="bg-gray-50 rounded-lg shadow p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">红球热号</h4>
          <div className="space-y-1">
            {Array.from({ length: 35 }, (_, i) => i + 1)
              .filter(num => {
                // 检查是否在最近几期中连续出现
                for (let j = 0; j < Math.min(5, recentData.length); j++) {
                  if (isConsecutiveHot(num, 'front', j, recentData)) return true;
                }
                return false;
              })
              .slice(0, 5)
              .map(num => (
                <div key={num} className="flex justify-between text-xs">
                  <span className="text-red-600">{num.toString().padStart(2, '0')}</span>
                  <span className="text-red-600">连续热号</span>
                </div>
              ))}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg shadow p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">蓝球热号</h4>
          <div className="space-y-1">
            {Array.from({ length: 12 }, (_, i) => i + 1)
              .filter(num => {
                // 检查是否在最近几期中连续出现
                for (let i = 0; i < Math.min(5, recentData.length); i++) {
                  if (isConsecutiveHot(num, 'back', i, recentData)) return true;
                }
                return false;
              })
              .slice(0, 3)
              .map(num => (
                <div key={num} className="flex justify-between text-xs">
                  <span className="text-blue-600">{num.toString().padStart(2, '0')}</span>
                  <span className="text-blue-600">连续热号</span>
                </div>
              ))}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg shadow p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">红球冷号</h4>
          <div className="space-y-1">
            {Array.from({ length: 35 }, (_, i) => i + 1)
              .sort((a, b) => {
                const aMissing = calculateMissingPeriods(a, 'front', recentData.length - 1, recentData);
                const bMissing = calculateMissingPeriods(b, 'front', recentData.length - 1, recentData);
                return bMissing - aMissing;
              })
              .slice(0, 5)
              .map(num => {
                const missing = calculateMissingPeriods(num, 'front', recentData.length - 1, recentData);
                return (
                  <div key={num} className="flex justify-between text-xs">
                    <span className="text-gray-600">{num.toString().padStart(2, '0')}</span>
                    <span className="text-gray-600">遗漏{missing}期</span>
                  </div>
                );
              })}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">斜连号分析</h4>
          <div className="space-y-1 text-xs">
            {recentData.slice(-5).map((item, index) => {
              const frontHasDiagonal = Array.from({ length: 35 }, (_, i) => i + 1)
                .some(num => isDiagonalConsecutive(num, 'front', recentData.length - 5 + index, recentData));
              const backHasDiagonal = Array.from({ length: 12 }, (_, i) => i + 1)
                .some(num => isDiagonalConsecutive(num, 'back', recentData.length - 5 + index, recentData));
              
              return (
                <div key={item.period} className="flex justify-between">
                  <span>{item.issue}</span>
                  <span className={frontHasDiagonal || backHasDiagonal ? "text-orange-600" : "text-gray-500"}>
                    {frontHasDiagonal && backHasDiagonal ? "前后区斜连" :
                     frontHasDiagonal ? "前区斜连" :
                     backHasDiagonal ? "后区斜连" : "无斜连"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default TrendChart;
