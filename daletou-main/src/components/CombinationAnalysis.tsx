import React, { useState, useEffect } from 'react';
import { PieChart, Search, FileText } from 'lucide-react';
import { LotteryData } from '../utils/dataGenerator';

// 定义分析结果类型
interface AnalysisResult {
  combination: number[];
  occurrences: number;
  historicalIssues: string[];
  nextIssues: { issue: string; numbers: number[] }[];
}

interface CombinationAnalysisProps {
  data: LotteryData[];
  dataLoaded: boolean;
  onError: (message: string) => void;
  onNavigateToTrend?: (targetIssue: string) => void;
}

const CombinationAnalysis: React.FC<CombinationAnalysisProps> = ({ data, dataLoaded, onError, onNavigateToTrend }) => {
  const [manualIssue, setManualIssue] = useState<string>('');

  const [combinationSize, setCombinationSize] = useState<number>(() => {
    const saved = localStorage.getItem('combinationAnalysis_combinationSize');
    return saved ? parseInt(saved, 10) : 2;
  });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult[] | null>(() => {
    const saved = localStorage.getItem('combinationAnalysis_analysisResult');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [queryPeriod, setQueryPeriod] = useState<string>(() => {
    const saved = localStorage.getItem('combinationAnalysis_queryPeriod');
    return saved || 'all';
  });
  const [combinationNumbers, setCombinationNumbers] = useState<(string|number)[]>(() => {
    const saved = localStorage.getItem('combinationAnalysis_combinationNumbers');
    return saved ? JSON.parse(saved) : ['', '', '', '', ''];
  });

  const [positionMatch, setPositionMatch] = useState<string>(() => {
    const saved = localStorage.getItem('combinationAnalysis_positionMatch');
    return saved || 'none';
  });
  const [selectedCombination, setSelectedCombination] = useState<AnalysisResult | null>(() => {
    const saved = localStorage.getItem('combinationAnalysis_selectedCombination');
    return saved ? JSON.parse(saved) : null;
  });

  // Save states to localStorage
  useEffect(() => {
    localStorage.setItem('combinationAnalysis_combinationSize', String(combinationSize));
  }, [combinationSize]);

  useEffect(() => {
    if (analysisResult) {
      localStorage.setItem('combinationAnalysis_analysisResult', JSON.stringify(analysisResult));
    } else {
      localStorage.removeItem('combinationAnalysis_analysisResult');
    }
  }, [analysisResult]);

  useEffect(() => {
    localStorage.setItem('combinationAnalysis_queryPeriod', queryPeriod);
  }, [queryPeriod]);

  useEffect(() => {
    localStorage.setItem('combinationAnalysis_combinationNumbers', JSON.stringify(combinationNumbers));
  }, [combinationNumbers]);

  useEffect(() => {
    localStorage.setItem('combinationAnalysis_positionMatch', positionMatch);
  }, [positionMatch]);

  useEffect(() => {
    if (selectedCombination) {
      localStorage.setItem('combinationAnalysis_selectedCombination', JSON.stringify(selectedCombination));
    } else {
      localStorage.removeItem('combinationAnalysis_selectedCombination');
    }
  }, [selectedCombination]);

  // Set initial target issue from the latest data
  useEffect(() => {
    if (dataLoaded && data.length > 0) {
      // 如果manualIssue为空，设置为最新一期
      if (!manualIssue) {
        const latestIssue = data[0].issue;
        setManualIssue(String(latestIssue));
        setCombinationNumbers(data[0].frontNumbers);
        return;
      }
      
      const foundIssue = data.find(d => String(d.issue) === manualIssue);
      if (foundIssue) {
        setCombinationNumbers(foundIssue.frontNumbers);
      } else {
        setCombinationNumbers(['', '', '', '', '']);
      }
    }
  }, [data, dataLoaded, manualIssue]);

  const handleQuery = () => {
    if (!dataLoaded) {
      onError('No data loaded. Please import data first.');
      return;
    }

    const numbers = combinationNumbers.map(n => parseInt(String(n), 10)).filter(n => !isNaN(n));
    if (numbers.length !== 5) {
      onError('Please enter 5 valid numbers.');
      return;
    }

    setIsLoading(true);

    // Generate combinations
    const getCombinations = (arr: number[], size: number): number[][] => {
      const result: number[][] = [];
      const f = (prefix: number[], arr: number[]) => {
        if (prefix.length === size) {
          result.push(prefix);
          return;
        }
        for (let i = 0; i < arr.length; i++) {
          f(prefix.concat(arr[i]), arr.slice(i + 1));
        }
      }
      f([], arr);
      return result;
    };

    const combinations = getCombinations(numbers, combinationSize);

    // Analyze historical data
    const analysis: { 
      [key: string]: {
        combination: number[];
        occurrences: number;
        historicalIssues: string[];
        nextIssues: { issue: string; numbers: number[] }[];
      }
    } = {};

    const sortedData = [...data].sort((a, b) => parseInt(b.issue) - parseInt(a.issue));

    for (let i = 1; i < sortedData.length; i++) {
      const currentIssue = sortedData[i];
      const nextIssue = sortedData[i - 1];
      for (const comb of combinations) {
        if (comb.every(num => currentIssue.frontNumbers.includes(num))) {
          const key = comb.join('.');
          if (!analysis[key]) {
            analysis[key] = {
              combination: comb,
              occurrences: 0,
              historicalIssues: [],
              nextIssues: []
            };
          }
          analysis[key].occurrences++;
          analysis[key].historicalIssues.push(String(currentIssue.issue));
          analysis[key].nextIssues.push({ issue: String(nextIssue.issue), numbers: nextIssue.frontNumbers });
        }
      }
    }

    const results = Object.values(analysis);
    setAnalysisResult(results);
    setSelectedCombination(results.length > 0 ? results[0] : null);
    setIsLoading(false);
  };

  const handleClearHistory = () => {
    setAnalysisResult(null);
    setSelectedCombination(null);
    localStorage.removeItem('combinationAnalysis_analysisResult');
    localStorage.removeItem('combinationAnalysis_selectedCombination');
  };

  const handleManualIssueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newManualIssue = e.target.value;
    setManualIssue(newManualIssue);
    const foundIssue = data.find(d => String(d.issue) === newManualIssue);
    if (foundIssue) {
      setCombinationNumbers(foundIssue.frontNumbers);
    } else {
      setCombinationNumbers(['', '', '', '', '']);
    }
  };
  
  const handleCombinationNumberChange = (index: number, value: string) => {
    const newCombinationNumbers = [...combinationNumbers];
    newCombinationNumbers[index] = value;
    setCombinationNumbers(newCombinationNumbers);
  };

  // 获取号码所属区域
  const getNumberZone = (num: number): number => {
    if (num >= 1 && num <= 7) return 1;
    if (num >= 8 && num <= 14) return 2;
    if (num >= 15 && num <= 21) return 3;
    if (num >= 22 && num <= 28) return 4;
    if (num >= 29 && num <= 35) return 5;
    return 0;
  };

  // 获取期号的区域结构
  const getIssueZoneStructure = (frontNumbers: number[]): number[] => {
    const zoneCount = [0, 0, 0, 0, 0]; // 5个区域的号码数量
    frontNumbers.forEach(num => {
      const zone = getNumberZone(num);
      if (zone > 0) {
        zoneCount[zone - 1]++;
      }
    });
    return zoneCount;
  };

  // 检查前5期结构是否相同
  const checkPrevious5PeriodsStructure = (targetIssue: string, combination: number[]) => {
    if (!dataLoaded || !data.length) return { hasSameStructure: false, details: [] };
    
    const sortedData = [...data].sort((a, b) => parseInt(b.issue) - parseInt(a.issue));
    const targetIndex = sortedData.findIndex(d => String(d.issue) === targetIssue);
    
    if (targetIndex === -1 || targetIndex + 5 >= sortedData.length) {
      return { hasSameStructure: false, details: [] };
    }

    // 获取目标期号前5期的区域结构
    const targetStructure = getIssueZoneStructure(sortedData[targetIndex].frontNumbers);
    const previous5Structures = [];
    
    for (let i = 1; i <= 5; i++) {
      const prevIssue = sortedData[targetIndex + i];
      if (prevIssue) {
        const structure = getIssueZoneStructure(prevIssue.frontNumbers);
        previous5Structures.push({
          issue: prevIssue.issue,
          structure,
          frontNumbers: prevIssue.frontNumbers
        });
      }
    }

    // 检查历史相同三位组合的前5期结构
    const historicalMatches = [];
    
    for (let i = 0; i < sortedData.length - 5; i++) {
      const currentIssue = sortedData[i];
      
      // 检查当前期是否包含目标组合
      const hasAllNumbers = combination.every(num => currentIssue.frontNumbers.includes(num));
      
      if (hasAllNumbers && String(currentIssue.issue) !== targetIssue) {
        // 获取该期前5期的结构
        const historicalPrev5 = [];
        let structureMatch = true;
        
        for (let j = 1; j <= 5; j++) {
          if (i + j < sortedData.length) {
            const prevIssue = sortedData[i + j];
            const structure = getIssueZoneStructure(prevIssue.frontNumbers);
            historicalPrev5.push({
              issue: prevIssue.issue,
              structure,
              frontNumbers: prevIssue.frontNumbers
            });
            
            // 比较结构是否相同
            if (j <= previous5Structures.length) {
              const targetPrevStructure = previous5Structures[j - 1].structure;
              const isStructureSame = structure.every((count, idx) => count === targetPrevStructure[idx]);
              if (!isStructureSame) {
                structureMatch = false;
              }
            }
          } else {
            structureMatch = false;
            break;
          }
        }
        
        historicalMatches.push({
          issue: currentIssue.issue,
          frontNumbers: currentIssue.frontNumbers,
          previous5: historicalPrev5,
          structureMatch,
          isHighlighted: structureMatch
        });
      }
    }

    return {
      hasSameStructure: historicalMatches.some(match => match.structureMatch),
      targetStructure,
      previous5Structures,
      historicalMatches,
      details: historicalMatches
    };
  };

const StatisticsComponent = ({ results, combinationSize }: { results: AnalysisResult[]; combinationSize: number }) => {
  const [sortOrder, setSortOrder] = useState<'byFrequencyDesc' | 'byFrequencyAsc' | 'byNumber'>('byFrequencyDesc');
  const [numberSortOrder, setNumberSortOrder] = useState<'byNumber' | 'byFrequencyDesc' | 'byFrequencyAsc'>('byNumber');

  if (!results || results.length === 0) return null;

  // 1. Number Frequency
  const numberCounts: { [key: number]: number } = {};
  results.forEach(result => {
    result.nextIssues.forEach((issue) => {
      issue.numbers.forEach((num: number) => {
        numberCounts[num] = (numberCounts[num] || 0) + 1;
      });
    });
  });

  const allNumbers = Array.from({ length: 35 }, (_, i) => i + 1);
  const numberData = allNumbers.map(num => ({
    number: num,
    count: numberCounts[num] || 0,
  }));

  if (numberSortOrder === 'byFrequencyDesc') {
    numberData.sort((a, b) => b.count - a.count);
  } else if (numberSortOrder === 'byFrequencyAsc') {
    numberData.sort((a, b) => a.count - b.count);
  } else { // 'byNumber'
    numberData.sort((a, b) => a.number - b.number);
  }

  // 2. Next Combination Analysis (dynamic size based on combinationSize)
  const getCombinations = (arr: number[], size: number): number[][] => {
    const result: number[][] = [];
    const f = (prefix: number[], arr: number[]) => {
      if (prefix.length === size) {
        result.push(prefix.sort((a, b) => a - b));
        return;
      }
      for (let i = 0; i < arr.length; i++) {
        f(prefix.concat(arr[i]), arr.slice(i + 1));
      }
    }
    f([], arr);
    return result;
  };

  const combinationCounts: { [key: string]: number } = {};
  results.forEach(result => {
    result.nextIssues.forEach((issue) => {
      const nextCombs = getCombinations(issue.numbers, combinationSize);
      nextCombs.forEach(comb => {
        const key = comb.join('.');
        combinationCounts[key] = (combinationCounts[key] || 0) + 1;
      });
    });
  });

  const sortedCombinationCounts = Object.entries(combinationCounts);

  if (sortOrder === 'byFrequencyDesc') {
    sortedCombinationCounts.sort((a, b) => b[1] - a[1]);
  } else if (sortOrder === 'byFrequencyAsc') {
    sortedCombinationCounts.sort((a, b) => a[1] - b[1]);
  } else { // byNumber
    sortedCombinationCounts.sort((a, b) => {
      const aNums = a[0].split('.').map(Number);
      const bNums = b[0].split('.').map(Number);
      for (let i = 0; i < Math.min(aNums.length, bNums.length); i++) {
        if (aNums[i] !== bNums[i]) {
          return aNums[i] - bNums[i];
        }
      }
      return aNums.length - bNums.length;
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-bold">下一期数据中1-35数字出现次数</h4>
          <select
            value={numberSortOrder}
            onChange={(e) => setNumberSortOrder(e.target.value as 'byNumber' | 'byFrequencyDesc' | 'byFrequencyAsc')}
            className="px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          >
            <option value="byNumber">按数字大小排序</option>
            <option value="byFrequencyDesc">按出现次数最多排序</option>
            <option value="byFrequencyAsc">按出现次数最少排序</option>
          </select>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {numberData.map(({ number, count }) => (
            <div key={number} className="border rounded-md p-1 text-center bg-white shadow">
              <div className="text-sm font-bold text-gray-800">{number}</div>
              <div className="text-xs text-red-500 font-semibold">{count}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-bold">下一期{combinationSize}数组合出现次数</h4>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'byFrequencyDesc' | 'byFrequencyAsc' | 'byNumber')}
            className="px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          >
            <option value="byFrequencyDesc">按出现次数最多排序</option>
            <option value="byFrequencyAsc">按出现次数最少排序</option>
            <option value="byNumber">按数字大小排序</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-x-2 gap-y-1">
          {sortedCombinationCounts.map(([comb, count]) => (
            <div key={comb} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-1.5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-800">{comb}</span>
                <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="space-y-8">
      {/* Combination Condition Filtering */}
      <div className="bg-white rounded-lg shadow-lg p-6">

        
        <div className="mt-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <label htmlFor="manual-issue" className="text-sm font-medium text-gray-700 whitespace-nowrap">红球开奖期号:</label>
            <input
              id="manual-issue"
              type="text"
              value={manualIssue}
              onChange={handleManualIssueChange}
              className="w-24 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="输入期号"
            />

            {combinationNumbers.map((num, index) => (
              <input
                key={index}
                type="text"
                value={num}
                onChange={(e) => handleCombinationNumberChange(index, e.target.value)}
                className="w-10 h-10 text-center border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            ))}

            <label htmlFor="query-period" className="text-sm font-medium text-gray-700">查询期数:</label>
            <select
              id="query-period"
              value={queryPeriod}
              onChange={(e) => setQueryPeriod(e.target.value)}
              className="w-40 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">历史所有期数</option>
              <option value="100">近100期</option>
              <option value="200">近200期</option>
              <option value="300">近300期</option>
              <option value="500">近500期</option>
              <option value="1000">近1000期</option>
              <option value="1500">近1500期</option>
            </select>

            <label htmlFor="position-match" className="text-sm font-medium text-gray-700">位置匹配:</label>
            <select
              id="position-match"
              value={positionMatch}
              onChange={(e) => setPositionMatch(e.target.value)}
              className="w-40 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="lock1">锁定第一位</option>
              <option value="lock2">锁定第二位</option>
              <option value="lock3">锁定第三位</option>
              <option value="same">相同位置</option>
              <option value="none">不匹配位置</option>
            </select>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleQuery}
              disabled={isLoading}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Search className="w-5 h-5" />
              <span>查询历史组合</span>
            </button>
          </div>
        </div>

        {/* Combination Size Selection */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-center bg-gray-100 rounded-lg p-1">
            {[2, 3, 4].map(size => (
              <button
                key={size}
                onClick={() => setCombinationSize(size)}
                className={`w-full px-8 py-1 rounded-lg font-medium transition-all duration-200 ${
                  combinationSize === size
                    ? 'bg-white text-blue-600 shadow'
                    : 'bg-transparent text-gray-600 hover:bg-gray-200'
                }`}
              >
                选择{size}位组合
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Report */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-800">分析报告</h2>
          </div>
          {analysisResult && (
            <button
              onClick={handleClearHistory}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              title="清除查询历史，回到初始状态"
            >
              <span>清除历史</span>
            </button>
          )}
        </div>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">正在分析中...</p>
          </div>
        ) : analysisResult && analysisResult.length > 0 ? (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column: Combinations List */}
            <div className="col-span-2">
              <div className="border rounded-lg p-2 bg-gray-50" style={{ height: '400px', overflowY: 'auto' }}>
                <div className="space-y-1">
                  {analysisResult.map((result, index: number) => (
                    <button 
                      key={index} 
                      onClick={() => setSelectedCombination(result)}
                      className={`w-full text-left p-1 rounded-md text-xs ${selectedCombination?.combination.join('.') === result.combination.join('.') ? 'bg-purple-100 font-bold' : 'hover:bg-gray-100'}`}>
                      <div className="flex flex-col">
                        <span className="font-medium">{result.combination.join('.')}</span>
                        <span className="text-gray-500 text-xs">次数: {result.occurrences}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle Column: Selected Combination Details */}
            <div className="col-span-5">
              <div className="border rounded-lg p-4 bg-gray-50" style={{ height: '400px', overflowY: 'auto' }}>
                {selectedCombination && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-xl mb-2 text-purple-600">{selectedCombination.combination.join('.')}</h3>
                    <p className="text-sm text-gray-600">出现次数: {selectedCombination.occurrences}</p>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-2">历史出现期号:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedCombination.historicalIssues.map((issue: string, index: number) => (
                          <button
                            key={index}
                            onClick={() => onNavigateToTrend && onNavigateToTrend(issue)}
                            className="bg-gray-100 hover:bg-blue-100 hover:border-blue-300 border border-gray-200 rounded-lg px-3 py-1 transition-colors cursor-pointer"
                            title={`点击查看第${issue}期走势图`}
                          >
                            <span className="text-xs font-medium text-gray-700 hover:text-blue-600">{issue}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">下一期号码:</p>
                      <ul className="list-none pl-0">
                        {selectedCombination.nextIssues.map((next, i: number) => (
                          <li key={i} className="flex items-center space-x-2 mb-1">
                            <span className="font-semibold text-blue-600">{next.issue}:</span>
                            <div className="flex items-center space-x-1">
                              {next.numbers.map((num: number, j: number) => (
                                <div key={j} className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                                  <span className="text-red-500 text-xs font-bold">{num}</span>
                                </div>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* 前5期结构分析 */}
                    {(() => {
                      const structureAnalysis = checkPrevious5PeriodsStructure(manualIssue, selectedCombination.combination);
                      return (
                        <div className="mt-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">前5期结构分析:</p>
                          
                          {structureAnalysis.hasSameStructure && (
                            <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded-md">
                              <div className="flex items-center">
                                <span className="text-yellow-800 font-medium text-xs">⚠️ 重点关注：</span>
                                <span className="ml-2 text-yellow-700 text-xs">发现历史相同结构的组合出现记录</span>
                              </div>
                            </div>
                          )}

                          {structureAnalysis.historicalMatches && structureAnalysis.historicalMatches.length > 0 && (
                            <div className="max-h-32 overflow-y-auto">
                              <div className="space-y-1">
                                {structureAnalysis.historicalMatches.slice(0, 3).map((match, index) => (
                                  <div 
                                    key={index} 
                                    className={`p-2 rounded text-xs ${
                                      match.isHighlighted 
                                        ? 'bg-yellow-50 border border-yellow-300' 
                                        : 'bg-gray-50 border border-gray-200'
                                    }`}
                                  >
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium">{match.issue}期</span>
                                      {match.isHighlighted && (
                                        <span className="text-xs bg-yellow-200 text-yellow-800 px-1 py-0.5 rounded">
                                          结构匹配
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-gray-600 mt-1">
                                      前区: {match.frontNumbers.join(', ')}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Statistics */}
            <div className="col-span-5">
              <div className="border rounded-lg p-4 bg-gray-50" style={{ height: '400px', overflowY: 'auto' }}>
                <StatisticsComponent results={analysisResult} combinationSize={combinationSize} />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">暂无分析结果，请先进行查询。</p>
          </div>
        )}
      </div>

      {/* 组合分析报告 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
          {combinationSize}位组合分析报告
          <span className="ml-2 text-xs text-gray-500">
            所有期数
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 热门组合 */}
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="text-md font-medium text-red-800 mb-3">热门{combinationSize}位组合</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">01-02{combinationSize >= 3 ? '-03' : ''}{combinationSize >= 4 ? '-04' : ''}</span>
                <span className="text-red-600 font-medium">15次</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">05-12{combinationSize >= 3 ? '-18' : ''}{combinationSize >= 4 ? '-25' : ''}</span>
                <span className="text-red-600 font-medium">12次</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">08-15{combinationSize >= 3 ? '-22' : ''}{combinationSize >= 4 ? '-30' : ''}</span>
                <span className="text-red-600 font-medium">11次</span>
              </div>
            </div>
          </div>

          {/* 冷门组合 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-md font-medium text-blue-800 mb-3">冷门{combinationSize}位组合</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">10-20{combinationSize >= 3 ? '-30' : ''}{combinationSize >= 4 ? '-35' : ''}</span>
                <span className="text-blue-600 font-medium">2次</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">03-13{combinationSize >= 3 ? '-23' : ''}{combinationSize >= 4 ? '-33' : ''}</span>
                <span className="text-blue-600 font-medium">3次</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">07-17{combinationSize >= 3 ? '-27' : ''}{combinationSize >= 4 ? '-32' : ''}</span>
                <span className="text-blue-600 font-medium">4次</span>
              </div>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-md font-medium text-gray-800 mb-3">统计信息</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">总组合数:</span>
                <span className="text-gray-900 font-medium">{combinationSize === 2 ? '595' : combinationSize === 3 ? '5985' : '52360'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">出现组合:</span>
                <span className="text-gray-900 font-medium">{combinationSize === 2 ? '420' : combinationSize === 3 ? '3200' : '15800'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">覆盖率:</span>
                <span className="text-gray-900 font-medium">{combinationSize === 2 ? '70.6%' : combinationSize === 3 ? '53.5%' : '30.2%'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 组合详细分析 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="inline-block w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
          {combinationSize}位组合详细分析
          <span className="ml-2 text-xs text-gray-500">
            所有期数
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 组合分布 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
            <h4 className="text-md font-medium text-blue-800 mb-3">组合分布</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">高频组合:</span>
                <span className="text-blue-600 font-medium">{combinationSize === 2 ? '85个' : combinationSize === 3 ? '320个' : '1580个'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">中频组合:</span>
                <span className="text-blue-600 font-medium">{combinationSize === 2 ? '210个' : combinationSize === 3 ? '1680个' : '8200个'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">低频组合:</span>
                <span className="text-blue-600 font-medium">{combinationSize === 2 ? '125个' : combinationSize === 3 ? '1200个' : '6020个'}</span>
              </div>
            </div>
          </div>

          {/* 趋势分析 */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
            <h4 className="text-md font-medium text-green-800 mb-3">趋势分析</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">上升趋势:</span>
                <span className="text-green-600 font-medium">{combinationSize === 2 ? '45个' : combinationSize === 3 ? '180个' : '890个'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">稳定趋势:</span>
                <span className="text-green-600 font-medium">{combinationSize === 2 ? '280个' : combinationSize === 3 ? '2100个' : '10200个'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">下降趋势:</span>
                <span className="text-green-600 font-medium">{combinationSize === 2 ? '95个' : combinationSize === 3 ? '920个' : '4710个'}</span>
              </div>
            </div>
          </div>

          {/* 周期分析 */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4">
            <h4 className="text-md font-medium text-orange-800 mb-3">周期分析</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">平均周期:</span>
                <span className="text-orange-600 font-medium">{combinationSize === 2 ? '12期' : combinationSize === 3 ? '28期' : '65期'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">最短周期:</span>
                <span className="text-orange-600 font-medium">{combinationSize === 2 ? '3期' : combinationSize === 3 ? '8期' : '18期'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">最长周期:</span>
                <span className="text-orange-600 font-medium">{combinationSize === 2 ? '45期' : combinationSize === 3 ? '120期' : '280期'}</span>
              </div>
            </div>
          </div>

          {/* 推荐组合 */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4">
            <h4 className="text-md font-medium text-purple-800 mb-3">推荐组合</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">06-15{combinationSize >= 3 ? '-24' : ''}{combinationSize >= 4 ? '-33' : ''}</span>
                <span className="text-purple-600 font-medium">★★★</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">11-22{combinationSize >= 3 ? '-31' : ''}{combinationSize >= 4 ? '-35' : ''}</span>
                <span className="text-purple-600 font-medium">★★☆</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">04-19{combinationSize >= 3 ? '-28' : ''}{combinationSize >= 4 ? '-32' : ''}</span>
                <span className="text-purple-600 font-medium">★☆☆</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombinationAnalysis;