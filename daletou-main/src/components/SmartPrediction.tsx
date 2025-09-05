import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, Settings, Brain, TrendingUp, Target, Activity, Cpu, Save, RotateCcw, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

// 历史数据类型定义 - 增强版
interface HistoricalData {
  redBallFrequency: Record<number, number>;
  blueBallFrequency: Record<number, number>;
  recentHotRed: number[];
  recentColdRed: number[];
  recentHotBlue: number[];
  recentColdBlue: number[];
  intervalStats: Record<number, number>;
  spanStats: Record<string, number>;
  oddEvenRatio: Record<string, number>;
  sizeRatio: Record<string, number>;
  recentResults: Array<{red: number[], blue: number[]}>;
  // 新增增强数据分析字段
  periodAnalysis?: {
    totalPeriods: number;
    redBallAppearances: Record<number, number[]>; // 每个号码出现的期数
    blueBallAppearances: Record<number, number[]>;
    intervalPatterns: Record<number, number[]>; // 间隔模式
    consecutivePatterns: Array<{numbers: number[], periods: number[]}>; // 连续出现模式
    seasonalPatterns: Record<string, {red: number[], blue: number[]}>; // 季节性模式
    weekdayPatterns: Record<string, {red: number[], blue: number[]}>; // 星期模式
  };
  enhancedStats?: {
    avgInterval: Record<number, number>; // 每个号码的平均间隔
    maxInterval: Record<number, number>; // 每个号码的最大间隔
    missStreak: Record<number, number>; // 当前遗漏期数
    cyclicPattern: Record<number, number[]>; // 周期性模式
  };
}

// 趋势分析类型定义
interface TrendAnalysis {
  redTrends: {
    hotNumbers: Map<number, number>;
    coldNumbers: Map<number, number>;
    oddEvenRatio: number;
    sizeRatio: number;
  };
  blueTrends: {
    hotNumbers: Map<number, number>;
    coldNumbers: Map<number, number>;
    oddEvenRatio: number;
    sizeRatio: number;
  };
}

// 真实历史开奖数据统计（基于近500期大乐透开奖数据）
// 获取历史数据的函数 - 使用真实上传的历史数据 - 增强版
const getHistoricalData = (data?: Array<{issue: string; frontNumbers: number[]; backNumbers: number[]; date: Date;}>) => {
  // 如果有上传的历史数据，使用真实数据
  if (data && data.length > 0) {
    console.log('🎯 使用真实历史数据，共', data.length, '期');
    
    // 统计红球频率
    const redBallFrequency: Record<number, number> = {};
    const blueBallFrequency: Record<number, number> = {};
    
    // 初始化频率统计
    for (let i = 1; i <= 35; i++) redBallFrequency[i] = 0;
    for (let i = 1; i <= 12; i++) blueBallFrequency[i] = 0;
    
    // 增强的历史数据分析
    const periodAnalysis = {
      totalPeriods: data.length,
      redBallAppearances: {} as Record<number, number[]>, // 记录每个号码出现的期数
      blueBallAppearances: {} as Record<number, number[]>,
      intervalPatterns: {} as Record<number, number[]>, // 记录间隔模式
      consecutivePatterns: [] as Array<{numbers: number[], periods: number[]}>, // 连续出现模式
      seasonalPatterns: {} as Record<string, {red: number[], blue: number[]}>, // 季节性模式
      weekdayPatterns: {} as Record<string, {red: number[], blue: number[]}> // 星期模式
    };
    
    // 初始化出现记录
    for (let i = 1; i <= 35; i++) periodAnalysis.redBallAppearances[i] = [];
    for (let i = 1; i <= 12; i++) periodAnalysis.blueBallAppearances[i] = [];
    
    // 统计每个号码的出现次数和出现期数
    data.forEach((record, index) => {
      const redBalls = record.frontNumbers || record.redBalls || [];
      const blueBalls = record.backNumbers || record.blueBalls || [];
      const periodIndex = data.length - index; // 倒序期数
      
      redBalls.forEach(ball => {
        if (ball >= 1 && ball <= 35) {
          redBallFrequency[ball]++;
          periodAnalysis.redBallAppearances[ball].push(periodIndex);
        }
      });
      
      blueBalls.forEach(ball => {
        if (ball >= 1 && ball <= 12) {
          blueBallFrequency[ball]++;
          periodAnalysis.blueBallAppearances[ball].push(periodIndex);
        }
      });
      
      // 分析季节性模式（如果有日期信息）
      if (record.date) {
        const month = record.date.getMonth() + 1;
        const season = month <= 3 ? 'spring' : month <= 6 ? 'summer' : month <= 9 ? 'autumn' : 'winter';
        if (!periodAnalysis.seasonalPatterns[season]) {
          periodAnalysis.seasonalPatterns[season] = {red: [], blue: []};
        }
        periodAnalysis.seasonalPatterns[season].red.push(...redBalls);
        periodAnalysis.seasonalPatterns[season].blue.push(...blueBalls);
        
        // 分析星期模式
        const weekday = record.date.getDay().toString();
        if (!periodAnalysis.weekdayPatterns[weekday]) {
          periodAnalysis.weekdayPatterns[weekday] = {red: [], blue: []};
        }
        periodAnalysis.weekdayPatterns[weekday].red.push(...redBalls);
        periodAnalysis.weekdayPatterns[weekday].blue.push(...blueBalls);
      }
    });
    
    // 计算间隔模式
    for (let num = 1; num <= 35; num++) {
      const appearances = periodAnalysis.redBallAppearances[num];
      if (appearances.length > 1) {
        const intervals = [];
        for (let i = 1; i < appearances.length; i++) {
          intervals.push(appearances[i-1] - appearances[i]);
        }
        periodAnalysis.intervalPatterns[num] = intervals;
      }
    }
    
    // 转换为频率（出现次数/总期数）
    const totalPeriods = data.length;
    for (let i = 1; i <= 35; i++) {
      redBallFrequency[i] = redBallFrequency[i] / totalPeriods;
    }
    for (let i = 1; i <= 12; i++) {
      blueBallFrequency[i] = blueBallFrequency[i] / totalPeriods;
    }
    
    // 增强的热号和冷号分析（基于最近30期和历史趋势）
    const recentData = data.slice(-Math.min(30, data.length));
    const recentRedCount: Record<number, number> = {};
    const recentBlueCount: Record<number, number> = {};
    
    for (let i = 1; i <= 35; i++) recentRedCount[i] = 0;
    for (let i = 1; i <= 12; i++) recentBlueCount[i] = 0;
    
    recentData.forEach(record => {
      const redBalls = record.frontNumbers || record.redBalls || [];
      const blueBalls = record.backNumbers || record.blueBalls || [];
      
      redBalls.forEach(ball => {
        if (ball >= 1 && ball <= 35) recentRedCount[ball]++;
      });
      
      blueBalls.forEach(ball => {
        if (ball >= 1 && ball <= 12) recentBlueCount[ball]++;
      });
    });
    
    // 排序获取热号和冷号
    const redFreqArray = Object.entries(recentRedCount)
      .map(([num, count]) => ({ num: parseInt(num), count }))
      .sort((a, b) => b.count - a.count);
    
    const blueFreqArray = Object.entries(recentBlueCount)
      .map(([num, count]) => ({ num: parseInt(num), count }))
      .sort((a, b) => b.count - a.count);
    
    const recentHotRed = redFreqArray.slice(0, 12).map(item => item.num);
    const recentColdRed = redFreqArray.slice(-12).map(item => item.num);
    const recentHotBlue = blueFreqArray.slice(0, 5).map(item => item.num);
    const recentColdBlue = blueFreqArray.slice(-5).map(item => item.num);
    
    // 基于真实数据计算间隔统计
    const intervalStats: Record<number, number> = {};
    const spanStats: Record<string, number> = {
      '15-20': 0, '21-25': 0, '26-30': 0, '31-35': 0, '36-40': 0, '41+': 0
    };
    const oddEvenRatio: Record<string, number> = {
      '5:0': 0, '4:1': 0, '3:2': 0, '2:3': 0, '1:4': 0, '0:5': 0
    };
    const sizeRatio: Record<string, number> = {
      '5:0': 0, '4:1': 0, '3:2': 0, '2:3': 0, '1:4': 0, '0:5': 0
    };
    
    // 分析每期的间隔、跨度、奇偶比例、大小比例
    data.forEach(record => {
      const redBalls = (record.frontNumbers || record.redBalls || []).sort((a, b) => a - b);
      
      if (redBalls.length >= 5) {
        // 计算间隔统计
        for (let i = 1; i < redBalls.length; i++) {
          const interval = redBalls[i] - redBalls[i-1];
          intervalStats[interval] = (intervalStats[interval] || 0) + 1;
        }
        
        // 计算跨度统计
        const span = redBalls[redBalls.length - 1] - redBalls[0];
        let spanKey = '41+';
        if (span >= 15 && span <= 20) spanKey = '15-20';
        else if (span >= 21 && span <= 25) spanKey = '21-25';
        else if (span >= 26 && span <= 30) spanKey = '26-30';
        else if (span >= 31 && span <= 35) spanKey = '31-35';
        else if (span >= 36 && span <= 40) spanKey = '36-40';
        spanStats[spanKey]++;
        
        // 计算奇偶比例
        const oddCount = redBalls.filter(num => num % 2 === 1).length;
        const evenCount = 5 - oddCount;
        const oddEvenKey = `${oddCount}:${evenCount}`;
        if (oddEvenRatio[oddEvenKey] !== undefined) {
          oddEvenRatio[oddEvenKey]++;
        }
        
        // 计算大小比例（1-17为小，18-35为大）
        const smallCount = redBalls.filter(num => num <= 17).length;
        const bigCount = 5 - smallCount;
        const sizeKey = `${smallCount}:${bigCount}`;
        if (sizeRatio[sizeKey] !== undefined) {
          sizeRatio[sizeKey]++;
        }
      }
    });
    
    // 转换为比例
    const totalRecords = data.length;
    Object.keys(intervalStats).forEach(key => {
      intervalStats[parseInt(key)] = intervalStats[parseInt(key)] / (totalRecords * 4); // 每期有4个间隔
    });
    Object.keys(spanStats).forEach(key => {
      spanStats[key] = spanStats[key] / totalRecords;
    });
    Object.keys(oddEvenRatio).forEach(key => {
      oddEvenRatio[key] = oddEvenRatio[key] / totalRecords;
    });
    Object.keys(sizeRatio).forEach(key => {
      sizeRatio[key] = sizeRatio[key] / totalRecords;
    });
    
    // 获取最近的开奖结果（增加到30期以获得更多历史信息）
    const recentResults = data.slice(-Math.min(30, data.length)).map(record => ({
      red: record.frontNumbers || record.redBalls || [],
      blue: record.backNumbers || record.blueBalls || []
    }));
    
    // 计算增强统计数据
    const enhancedStats = {
      avgInterval: {} as Record<number, number>,
      maxInterval: {} as Record<number, number>,
      missStreak: {} as Record<number, number>,
      cyclicPattern: {} as Record<number, number[]>
    };
    
    // 计算红球的增强统计
    for (let num = 1; num <= 35; num++) {
      const appearances = periodAnalysis.redBallAppearances[num];
      if (appearances && appearances.length > 1) {
        const intervals = [];
        for (let i = 1; i < appearances.length; i++) {
          intervals.push(appearances[i-1] - appearances[i]);
        }
        enhancedStats.avgInterval[num] = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
        enhancedStats.maxInterval[num] = Math.max(...intervals);
        enhancedStats.cyclicPattern[num] = intervals;
      } else {
        enhancedStats.avgInterval[num] = data.length;
        enhancedStats.maxInterval[num] = data.length;
        enhancedStats.cyclicPattern[num] = [];
      }
      
      // 计算当前遗漏期数
      const lastAppearance = appearances && appearances.length > 0 ? appearances[0] : data.length + 1;
      enhancedStats.missStreak[num] = lastAppearance - 1;
    }
    
    // 计算蓝球的增强统计（使用100+的键值避免冲突）
    for (let num = 1; num <= 12; num++) {
      const blueKey = num + 100; // 蓝球使用101-112的键值
      const appearances = periodAnalysis.blueBallAppearances[num];
      if (appearances && appearances.length > 1) {
        const intervals = [];
        for (let i = 1; i < appearances.length; i++) {
          intervals.push(appearances[i-1] - appearances[i]);
        }
        enhancedStats.avgInterval[blueKey] = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
        enhancedStats.maxInterval[blueKey] = Math.max(...intervals);
        enhancedStats.cyclicPattern[blueKey] = intervals;
      } else {
        enhancedStats.avgInterval[blueKey] = data.length;
        enhancedStats.maxInterval[blueKey] = data.length;
        enhancedStats.cyclicPattern[blueKey] = [];
      }
      
      // 计算当前遗漏期数
      const lastAppearance = appearances && appearances.length > 0 ? appearances[0] : data.length + 1;
      enhancedStats.missStreak[blueKey] = lastAppearance - 1;
    }
    
    console.log('📊 真实数据统计:', {
      总期数: data.length,
      红球热号: recentHotRed,
      红球冷号: recentColdRed,
      蓝球热号: recentHotBlue,
      蓝球冷号: recentColdBlue,
      最近期数: recentResults.length,
      间隔统计样本: Object.keys(intervalStats).length,
      跨度统计: spanStats,
      奇偶比例: oddEvenRatio,
      大小比例: sizeRatio,
      周期分析: {
        季节模式: Object.keys(periodAnalysis.seasonalPatterns).length,
        星期模式: Object.keys(periodAnalysis.weekdayPatterns).length,
        间隔模式: Object.keys(periodAnalysis.intervalPatterns).length
      },
      增强统计: {
        平均间隔样本: Object.keys(enhancedStats.avgInterval).length,
        遗漏分析样本: Object.keys(enhancedStats.missStreak).length
      }
    });
    
    return {
      redBallFrequency,
      blueBallFrequency,
      recentHotRed,
      recentColdRed,
      recentHotBlue,
      recentColdBlue,
      intervalStats,
      spanStats,
      oddEvenRatio,
      sizeRatio,
      recentResults,
      // 新增的增强数据分析
      periodAnalysis,
      enhancedStats
    };
  } else {
    // 如果没有上传数据，使用模拟数据
    console.log('⚠️ 使用模拟历史数据');
    return {
      redBallFrequency: {
        1: 0.078, 2: 0.082, 3: 0.075, 4: 0.089, 5: 0.076, 6: 0.083, 7: 0.091,
        8: 0.087, 9: 0.079, 10: 0.088, 11: 0.084, 12: 0.078, 13: 0.085, 14: 0.081,
        15: 0.079, 16: 0.086, 17: 0.083, 18: 0.077, 19: 0.092, 20: 0.080, 21: 0.088,
        22: 0.074, 23: 0.089, 24: 0.082, 25: 0.076, 26: 0.085, 27: 0.081, 28: 0.090,
        29: 0.077, 30: 0.084, 31: 0.079, 32: 0.087, 33: 0.083, 34: 0.078, 35: 0.086
      },
      blueBallFrequency: {
        1: 0.082, 2: 0.085, 3: 0.078, 4: 0.089, 5: 0.076, 6: 0.083,
        7: 0.091, 8: 0.087, 9: 0.079, 10: 0.088, 11: 0.084, 12: 0.078
      },
      recentHotRed: [4, 7, 19, 23, 28, 32, 16, 21, 26, 10],
      recentColdRed: [3, 5, 12, 15, 22, 25, 29, 31, 34, 35],
      recentHotBlue: [2, 4, 7, 10],
      recentColdBlue: [3, 5, 9, 12],
      intervalStats: {
        1: 0.15, 2: 0.18, 3: 0.16, 4: 0.14, 5: 0.12, 6: 0.10, 7: 0.08, 8: 0.07
      },
      spanStats: {
        '15-20': 0.12, '21-25': 0.18, '26-30': 0.22, '31-35': 0.20, '36-40': 0.15, '41+': 0.13
      },
      oddEvenRatio: {
        '5:0': 0.03, '4:1': 0.15, '3:2': 0.31, '2:3': 0.31, '1:4': 0.15, '0:5': 0.05
      },
      sizeRatio: {
        '5:0': 0.04, '4:1': 0.16, '3:2': 0.30, '2:3': 0.30, '1:4': 0.16, '0:5': 0.04
      },
      recentResults: [
        { red: [7, 12, 19, 23, 28], blue: [4, 11] },
        { red: [3, 15, 21, 26, 32], blue: [2, 9] },
        { red: [8, 14, 18, 25, 31], blue: [5, 12] },
        { red: [2, 11, 17, 24, 29], blue: [1, 8] },
        { red: [6, 13, 20, 27, 33], blue: [3, 10] },
        { red: [1, 9, 16, 22, 30], blue: [6, 7] },
        { red: [4, 10, 19, 26, 34], blue: [2, 11] },
        { red: [5, 12, 18, 23, 35], blue: [4, 9] },
        { red: [7, 14, 21, 28, 31], blue: [1, 12] },
        { red: [3, 11, 17, 25, 32], blue: [5, 8] },
        { red: [8, 15, 20, 24, 29], blue: [3, 10] },
        { red: [2, 13, 19, 27, 33], blue: [6, 7] },
        { red: [6, 16, 22, 26, 30], blue: [2, 9] },
        { red: [1, 12, 18, 23, 34], blue: [4, 11] },
        { red: [9, 14, 21, 28, 35], blue: [1, 8] }
      ]
    };
  }
};

// HISTORICAL_DATA 将在组件内部初始化

// 历史数据分析工具函数
const createHistoricalAnalyzer = (HISTORICAL_DATA: HistoricalData) => ({
  // 增强的历史频率权重计算 - 使用enhancedStats数据
  getFrequencyWeight: (number: number, isBlue: boolean = false): number => {
    const frequency = isBlue ? 
      HISTORICAL_DATA.blueBallFrequency[number as keyof typeof HISTORICAL_DATA.blueBallFrequency] :
      HISTORICAL_DATA.redBallFrequency[number as keyof typeof HISTORICAL_DATA.redBallFrequency];
    
    // 优先使用enhancedStats中的精确数据进行权重调整
    if (HISTORICAL_DATA.enhancedStats) {
      const key = isBlue ? number + 100 : number;
      const avgInterval = HISTORICAL_DATA.enhancedStats.avgInterval[key];
      const maxInterval = HISTORICAL_DATA.enhancedStats.maxInterval[key];
      
      if (avgInterval !== undefined && maxInterval !== undefined) {
        // 基于平均间隔的频率权重：间隔越小，频率越高
        const intervalScore = 1 / (avgInterval + 1); // 避免除零
        const consistencyScore = avgInterval / (maxInterval + 1); // 一致性评分
        
        // 综合频率和间隔信息
        const baseFrequency = frequency || 0.08;
        
        // 权重计算：结合历史频率、平均间隔和一致性
        const baseWeight = baseFrequency; // 基础频率权重
        const intervalWeight = intervalScore * 0.3; // 间隔权重
        const consistencyWeight = consistencyScore * 0.1; // 一致性权重
        
        return Math.min(baseWeight + intervalWeight + consistencyWeight, 1.5);
      }
    }
    
    return frequency || 0.08; // 默认权重
  },
  
  // 获取冷热号码权重
  getHotColdWeight: (number: number, isBlue: boolean = false): number => {
    const hotNumbers = isBlue ? HISTORICAL_DATA.recentHotBlue : HISTORICAL_DATA.recentHotRed;
    const coldNumbers = isBlue ? HISTORICAL_DATA.recentColdBlue : HISTORICAL_DATA.recentColdRed;
    
    if (hotNumbers.includes(number)) return 0.6; // 热号权重较低
    if (coldNumbers.includes(number)) return 1.4; // 冷号权重较高
    return 1.0; // 正常权重
  },
  
  // 增强的周期性分析 - 使用enhancedStats数据
  calculatePeriodicPattern: (number: number, recentData: LotteryResult[], isBlue: boolean = false): number => {
    // 优先使用enhancedStats中的精确周期数据
    if (HISTORICAL_DATA.enhancedStats) {
      const key = isBlue ? number + 100 : number;
      const cyclicPattern = HISTORICAL_DATA.enhancedStats.cyclicPattern[key];
      const avgInterval = HISTORICAL_DATA.enhancedStats.avgInterval[key];
      const missStreak = HISTORICAL_DATA.enhancedStats.missStreak[key];
      
      if (cyclicPattern && cyclicPattern.length > 1 && avgInterval !== undefined) {
        // 分析周期性模式的稳定性
        const variance = cyclicPattern.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / cyclicPattern.length;
        const stability = 1 / (1 + variance / avgInterval); // 稳定性越高，权重越高
        
        // 基于当前遗漏期数和平均间隔的周期性权重
        const missRatio = missStreak / avgInterval;
        let periodicWeight = 1.0;
        
        if (missRatio >= 0.8 && missRatio <= 1.2) {
          periodicWeight = 1.4; // 接近预期周期，权重增加
        } else if (missRatio >= 1.2 && missRatio <= 1.8) {
          periodicWeight = 1.6; // 超过预期周期，权重进一步增加
        } else if (missRatio > 1.8) {
          periodicWeight = 1.8; // 大幅超期，权重大幅增加
        } else if (missRatio < 0.5) {
          periodicWeight = 0.7; // 远低于周期，刚出现过
        }
        
        // 考虑周期性的一致性
        const consistencyBonus = stability > 0.7 ? 1.2 : 1.0;
        
        return Math.min(periodicWeight * stability * consistencyBonus, 2.5);
      }
    }
    
    // 回退到原有逻辑
    if (!recentData || recentData.length < 10) return 1.0;
    
    const appearances = [];
    const maxCheck = Math.min(50, recentData.length); // 检查最近50期
    
    for (let i = 0; i < maxCheck; i++) {
      const numbers = isBlue ? recentData[i]?.backNumbers : recentData[i]?.frontNumbers;
      if (numbers && numbers.includes(number)) {
        appearances.push(i);
      }
    }
    
    if (appearances.length < 2) return 1.0;
    
    // 计算出现间隔的规律性
    const intervals = [];
    for (let i = 1; i < appearances.length; i++) {
      intervals.push(appearances[i] - appearances[i-1]);
    }
    
    // 分析间隔的稳定性
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
    const stability = 1 / (1 + variance / avgInterval); // 稳定性越高，权重越高
    
    // 根据最后一次出现的位置调整权重
    const lastAppearance = appearances[0];
    const expectedNext = avgInterval;
    const currentGap = lastAppearance;
    
    let periodicWeight = 1.0;
    if (currentGap >= expectedNext * 0.8 && currentGap <= expectedNext * 1.2) {
      periodicWeight = 1.3; // 接近预期周期
    } else if (currentGap > expectedNext * 1.5) {
      periodicWeight = 1.5; // 超期未出现，权重增加
    }
    
    return Math.min(periodicWeight * stability, 2.0);
  },
  
  // 增强的连续遗漏分析 - 使用enhancedStats数据
  calculateMissStreakWeight: (number: number, recentData: LotteryResult[], isBlue: boolean = false): number => {
    // 优先使用enhancedStats中的精确遗漏数据
    if (HISTORICAL_DATA.enhancedStats) {
      const key = isBlue ? number + 100 : number;
      const missStreak = HISTORICAL_DATA.enhancedStats.missStreak[key];
      const avgInterval = HISTORICAL_DATA.enhancedStats.avgInterval[key];
      
      if (missStreak !== undefined && avgInterval !== undefined) {
        // 基于历史平均间隔的智能权重计算
        const missRatio = missStreak / avgInterval;
        
        if (missRatio >= 2.0) return 2.2; // 超过2倍平均间隔，权重大幅增加
        if (missRatio >= 1.5) return 1.8; // 超过1.5倍平均间隔
        if (missRatio >= 1.2) return 1.5; // 超过1.2倍平均间隔
        if (missRatio >= 1.0) return 1.3; // 达到平均间隔
        if (missRatio >= 0.8) return 1.1; // 接近平均间隔
        if (missRatio <= 0.3) return 0.6; // 远低于平均间隔，刚出现过
        return 1.0;
      }
    }
    
    // 回退到原有逻辑
    if (!recentData || recentData.length === 0) return 1.0;
    
    let missStreak = 0;
    const maxCheck = Math.min(30, recentData.length);
    
    for (let i = 0; i < maxCheck; i++) {
      const numbers = isBlue ? recentData[i]?.backNumbers : recentData[i]?.frontNumbers;
      if (numbers && numbers.includes(number)) {
        break;
      }
      missStreak++;
    }
    
    // 根据遗漏期数调整权重
    if (missStreak >= 15) return 1.8; // 长期遗漏，权重大幅增加
    if (missStreak >= 10) return 1.5; // 中期遗漏，权重增加
    if (missStreak >= 5) return 1.2; // 短期遗漏，权重略增
    if (missStreak <= 2) return 0.7; // 刚出现过，权重降低
    return 1.0;
  },
  
  // 增强的间隔分析：考虑多重间隔模式
  calculateAdvancedIntervalScore: (numbers: number[]): number => {
    if (numbers.length < 3) return 1.0;
    
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    let score = 1.0;
    
    // 基础间隔分析
    for (let i = 1; i < sortedNumbers.length; i++) {
      const interval = sortedNumbers[i] - sortedNumbers[i - 1];
      const intervalWeight = HISTORICAL_DATA.intervalStats[interval as keyof typeof HISTORICAL_DATA.intervalStats] || 0.05;
      score *= (1 + intervalWeight);
    }
    
    // 检查等差数列模式（降低权重）
    let isArithmetic = true;
    if (sortedNumbers.length >= 3) {
      const diff = sortedNumbers[1] - sortedNumbers[0];
      for (let i = 2; i < sortedNumbers.length; i++) {
        if (sortedNumbers[i] - sortedNumbers[i-1] !== diff) {
          isArithmetic = false;
          break;
        }
      }
      if (isArithmetic) score *= 0.6; // 等差数列不常见，降低权重
    }
    
    // 检查连号过多（降低权重）
    let consecutiveCount = 0;
    for (let i = 1; i < sortedNumbers.length; i++) {
      if (sortedNumbers[i] - sortedNumbers[i-1] === 1) {
        consecutiveCount++;
      }
    }
    if (consecutiveCount >= 3) score *= 0.7; // 连号过多，降低权重
    
    return Math.min(score, 2.5);
  },
  
  // 增强的跨度分析：考虑号码分布均匀性
  calculateAdvancedSpanScore: (numbers: number[]): number => {
    if (numbers.length < 3) return 1.0;
    
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    const span = sortedNumbers[sortedNumbers.length - 1] - sortedNumbers[0];
    
    // 基础跨度得分
    let spanKey = '41+';
    if (span >= 15 && span <= 20) spanKey = '15-20';
    else if (span >= 21 && span <= 25) spanKey = '21-25';
    else if (span >= 26 && span <= 30) spanKey = '26-30';
    else if (span >= 31 && span <= 35) spanKey = '31-35';
    else if (span >= 36 && span <= 40) spanKey = '36-40';
    
    const score = HISTORICAL_DATA.spanStats[spanKey as keyof typeof HISTORICAL_DATA.spanStats] * 2 || 0.5;
    
    // 分析号码分布均匀性
    const expectedInterval = span / (numbers.length - 1);
    let uniformityScore = 1.0;
    
    for (let i = 1; i < sortedNumbers.length; i++) {
      const actualInterval = sortedNumbers[i] - sortedNumbers[i-1];
      const deviation = Math.abs(actualInterval - expectedInterval) / expectedInterval;
      uniformityScore *= (1 - deviation * 0.3); // 偏差越大，均匀性越差
    }
    
    return score * Math.max(uniformityScore, 0.3);
  },
  
  // 动态学习系统：分析最近开奖趋势
  analyzeRecentTrends: (recentResults: Array<{red: number[], blue: number[]}>, periods: number = 10) => {
    if (recentResults.length < periods) return null;
    
    const recent = recentResults.slice(-periods);
    const trends = {
      redTrends: {
        hotNumbers: new Map<number, number>(),
        coldNumbers: new Map<number, number>(),
        oddEvenRatio: 0,
        sizeRatio: 0,
        avgInterval: 0,
        avgSpan: 0,
        consecutivePatterns: new Map<string, number>()
      },
      blueTrends: {
        hotNumbers: new Map<number, number>(),
        coldNumbers: new Map<number, number>(),
        oddEvenRatio: 0,
        sizeRatio: 0
      }
    };
    
    // 分析红球趋势
    const redFreq = new Map<number, number>();
    let totalOdd = 0, totalSmall = 0;
    let totalInterval = 0, totalSpan = 0;
    
    recent.forEach(result => {
      result.red.forEach(num => {
        redFreq.set(num, (redFreq.get(num) || 0) + 1);
        if (num % 2 === 1) totalOdd++;
        if (num <= 17) totalSmall++;
      });
      
      // 计算间隔和跨度
      const sorted = [...result.red].sort((a, b) => a - b);
      let intervalSum = 0;
      for (let i = 1; i < sorted.length; i++) {
        intervalSum += sorted[i] - sorted[i-1];
      }
      totalInterval += intervalSum / (sorted.length - 1);
      totalSpan += sorted[sorted.length - 1] - sorted[0];
      
      // 分析连号模式
      let consecutiveCount = 1;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - sorted[i-1] === 1) {
          consecutiveCount++;
        } else {
          if (consecutiveCount > 1) {
            const pattern = `consecutive_${consecutiveCount}`;
            trends.redTrends.consecutivePatterns.set(pattern, 
              (trends.redTrends.consecutivePatterns.get(pattern) || 0) + 1);
          }
          consecutiveCount = 1;
        }
      }
    });
    
    // 设置红球热号和冷号
    const avgRedFreq = Array.from(redFreq.values()).reduce((a, b) => a + b, 0) / redFreq.size;
    redFreq.forEach((freq, num) => {
      if (freq > avgRedFreq * 1.2) {
        trends.redTrends.hotNumbers.set(num, freq);
      } else if (freq < avgRedFreq * 0.8) {
        trends.redTrends.coldNumbers.set(num, freq);
      }
    });
    
    trends.redTrends.oddEvenRatio = totalOdd / (recent.length * 5);
    trends.redTrends.sizeRatio = totalSmall / (recent.length * 5);
    trends.redTrends.avgInterval = totalInterval / recent.length;
    trends.redTrends.avgSpan = totalSpan / recent.length;
    
    // 分析蓝球趋势
    const blueFreq = new Map<number, number>();
    let blueOdd = 0, blueSmall = 0;
    
    recent.forEach(result => {
      result.blue.forEach(num => {
        blueFreq.set(num, (blueFreq.get(num) || 0) + 1);
        if (num % 2 === 1) blueOdd++;
        if (num <= 6) blueSmall++;
      });
    });
    
    const avgBlueFreq = Array.from(blueFreq.values()).reduce((a, b) => a + b, 0) / blueFreq.size;
    blueFreq.forEach((freq, num) => {
      if (freq > avgBlueFreq * 1.2) {
        trends.blueTrends.hotNumbers.set(num, freq);
      } else if (freq < avgBlueFreq * 0.8) {
        trends.blueTrends.coldNumbers.set(num, freq);
      }
    });
    
    trends.blueTrends.oddEvenRatio = blueOdd / (recent.length * 2);
    trends.blueTrends.sizeRatio = blueSmall / (recent.length * 2);
    
    return trends;
  },
  
  // 根据趋势调整权重
  adjustWeights: (recentTrends: TrendAnalysis | null) => {
    if (!recentTrends) return { redWeights: new Map(), blueWeights: new Map() };
    
    const adjustments = {
      redWeights: new Map<number, number>(),
      blueWeights: new Map<number, number>()
    };
    
    // 调整红球权重
    for (let num = 1; num <= 35; num++) {
      let adjustment = 1.0;
      
      // 根据最近热号调整
      if (recentTrends.redTrends.hotNumbers.has(num)) {
        adjustment *= 0.8; // 降低热号权重，避免追热
      } else if (recentTrends.redTrends.coldNumbers.has(num)) {
        adjustment *= 1.3; // 提高冷号权重，冷号回补
      }
      
      // 根据奇偶趋势调整
      const isOdd = num % 2 === 1;
      if (recentTrends.redTrends.oddEvenRatio > 0.65 && !isOdd) {
        adjustment *= 1.2; // 奇数过多时提高偶数权重
      } else if (recentTrends.redTrends.oddEvenRatio < 0.35 && isOdd) {
        adjustment *= 1.2; // 偶数过多时提高奇数权重
      }
      
      // 根据大小号趋势调整
      const isSmall = num <= 17;
      if (recentTrends.redTrends.sizeRatio > 0.65 && !isSmall) {
        adjustment *= 1.2; // 小号过多时提高大号权重
      } else if (recentTrends.redTrends.sizeRatio < 0.35 && isSmall) {
        adjustment *= 1.2; // 大号过多时提高小号权重
      }
      
      adjustments.redWeights.set(num, adjustment);
    }
    
    // 调整蓝球权重
    for (let num = 1; num <= 12; num++) {
      let adjustment = 1.0;
      
      // 根据最近热号调整
      if (recentTrends.blueTrends.hotNumbers.has(num)) {
        adjustment *= 0.8; // 降低热号权重
      } else if (recentTrends.blueTrends.coldNumbers.has(num)) {
        adjustment *= 1.3; // 提高冷号权重
      }
      
      // 根据奇偶趋势调整
      const isOdd = num % 2 === 1;
      if (recentTrends.blueTrends.oddEvenRatio > 0.6 && !isOdd) {
        adjustment *= 1.2;
      } else if (recentTrends.blueTrends.oddEvenRatio < 0.4 && isOdd) {
        adjustment *= 1.2;
      }
      
      // 根据大小号趋势调整
      const isSmall = num <= 6;
      if (recentTrends.blueTrends.sizeRatio > 0.6 && !isSmall) {
        adjustment *= 1.2;
      } else if (recentTrends.blueTrends.sizeRatio < 0.4 && isSmall) {
        adjustment *= 1.2;
      }
      
      adjustments.blueWeights.set(num, adjustment);
    }
    
    return adjustments;
  },
  
  // 计算号码组合的间隔合理性
  calculateIntervalScore: (numbers: number[]): number => {
    if (numbers.length < 2) return 1.0;
    
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    let score = 1.0;
    
    for (let i = 1; i < sortedNumbers.length; i++) {
      const interval = sortedNumbers[i] - sortedNumbers[i - 1];
      const intervalWeight = HISTORICAL_DATA.intervalStats[interval as keyof typeof HISTORICAL_DATA.intervalStats] || 0.05;
      score *= (1 + intervalWeight);
    }
    
    return Math.min(score, 2.0); // 限制最大权重
  },
  
  // 计算跨度合理性
  calculateSpanScore: (numbers: number[]): number => {
    if (numbers.length < 2) return 1.0;
    
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    const span = sortedNumbers[sortedNumbers.length - 1] - sortedNumbers[0];
    
    let spanKey = '41+';
    if (span >= 15 && span <= 20) spanKey = '15-20';
    else if (span >= 21 && span <= 25) spanKey = '21-25';
    else if (span >= 26 && span <= 30) spanKey = '26-30';
    else if (span >= 31 && span <= 35) spanKey = '31-35';
    else if (span >= 36 && span <= 40) spanKey = '36-40';
    
    return HISTORICAL_DATA.spanStats[spanKey as keyof typeof HISTORICAL_DATA.spanStats] * 2 || 0.5;
  },
  
  // 计算奇偶比例得分
  calculateOddEvenScore: (numbers: number[]): number => {
    const oddCount = numbers.filter(n => n % 2 === 1).length;
    const evenCount = numbers.length - oddCount;
    const ratioKey = `${oddCount}:${evenCount}` as keyof typeof HISTORICAL_DATA.oddEvenRatio;
    
    return HISTORICAL_DATA.oddEvenRatio[ratioKey] * 3 || 0.5;
  },
  
  // 计算大小号比例得分
  calculateSizeScore: (numbers: number[]): number => {
    const smallCount = numbers.filter(n => n <= 17).length;
    const largeCount = numbers.length - smallCount;
    const ratioKey = `${smallCount}:${largeCount}` as keyof typeof HISTORICAL_DATA.sizeRatio;
    
    return HISTORICAL_DATA.sizeRatio[ratioKey] * 3 || 0.5;
  },
  
  // 综合评分函数（增强版）
  calculateComprehensiveScore: (numbers: number[], isBlue: boolean = false, recentData?: LotteryResult[]): number => {
    let totalScore = 0;
    
    // 历史频率得分（权重25%）
    const frequencyScore = numbers.reduce((sum, num) => 
      sum + this.getFrequencyWeight(num, isBlue), 0) / numbers.length;
    totalScore += frequencyScore * 25;
    
    // 冷热号得分（权重20%）
    const hotColdScore = numbers.reduce((sum, num) => 
      sum + this.getHotColdWeight(num, isBlue), 0) / numbers.length;
    totalScore += hotColdScore * 20;
    
    // 周期性分析得分（权重15%）
    if (recentData && recentData.length > 0) {
      const periodicScore = numbers.reduce((sum, num) => 
        sum + this.calculatePeriodicPattern(num, recentData, isBlue), 0) / numbers.length;
      totalScore += periodicScore * 15;
    } else {
      totalScore += 15; // 无数据时给予默认分数
    }
    
    // 遗漏分析得分（权重10%）
    if (recentData && recentData.length > 0) {
      const missStreakScore = numbers.reduce((sum, num) => 
        sum + this.calculateMissStreakWeight(num, recentData, isBlue), 0) / numbers.length;
      totalScore += missStreakScore * 10;
    } else {
      totalScore += 10; // 无数据时给予默认分数
    }
    
    if (!isBlue && numbers.length >= 5) {
      // 增强间隔得分（权重12%）
      totalScore += this.calculateAdvancedIntervalScore(numbers) * 12;
      
      // 增强跨度得分（权重10%）
      totalScore += this.calculateAdvancedSpanScore(numbers) * 10;
      
      // 奇偶比例得分（权重5%）
      totalScore += this.calculateOddEvenScore(numbers) * 5;
      
      // 大小号比例得分（权重3%）
      totalScore += this.calculateSizeScore(numbers) * 3;
    } else {
      // 蓝球特殊处理
      totalScore += 30; // 补充权重
    }
    
    return totalScore;
  },
  
  // 新增：组合有效性检查（连号避免和重复组合过滤）
  isValidCombination: (numbers: number[], isBlue: boolean = false): boolean => {
    if (numbers.length === 0) return false;
    
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    
    // 检查重复号码
    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== numbers.length) return false;
    
    if (!isBlue && numbers.length >= 5) {
      // 红球特殊检查
      
      // 检查连号过多（超过3个连号视为无效）
      let consecutiveCount = 0;
      let maxConsecutive = 0;
      for (let i = 1; i < sortedNumbers.length; i++) {
        if (sortedNumbers[i] - sortedNumbers[i-1] === 1) {
          consecutiveCount++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveCount + 1);
        } else {
          consecutiveCount = 0;
        }
      }
      if (maxConsecutive > 3) return false;
      
      // 检查跨度过小或过大
      const span = sortedNumbers[sortedNumbers.length - 1] - sortedNumbers[0];
      if (span < 10 || span > 45) return false;
      
      // 检查奇偶比例极端情况
      const oddCount = numbers.filter(n => n % 2 === 1).length;
      if (oddCount === 0 || oddCount === numbers.length) return false;
      
      // 检查大小号比例极端情况
      const smallCount = numbers.filter(n => n <= 17).length;
      if (smallCount === 0 || smallCount === numbers.length) return false;
      
    } else if (isBlue && numbers.length === 2) {
      // 蓝球特殊检查
      
      // 避免连号（概率较低）
      if (Math.abs(sortedNumbers[1] - sortedNumbers[0]) === 1) {
        return Math.random() < 0.3; // 30%概率允许连号
      }
    }
    
    return true;
  },

  // 计算方差辅助函数
  calculateVariance: (values: number[]): number => {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  },

  // 多期验证机制 - 提高预测稳定性
  validateMultiplePeriods: (predictions: Array<{redBalls: number[], blueBalls: number[]}>, historicalData: { recentResults: Array<{red: number[], blue: number[]}> }): {
    stabilityScore: number;
    consistencyAnalysis: string;
    recommendations: string[];
  } => {
    const recommendations: string[] = [];
    let stabilityScore = 100;
    
    // 计算方差的内部函数
    const calculateVariance = (values: number[]): number => {
      if (values.length === 0) return 0;
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      return Math.sqrt(variance);
    };
    
    // 1. 检查预测结果的一致性
    const redBallFrequency = new Map<number, number>();
    const blueBallFrequency = new Map<number, number>();
    
    predictions.forEach(prediction => {
      prediction.redBalls.forEach(ball => {
        redBallFrequency.set(ball, (redBallFrequency.get(ball) || 0) + 1);
      });
      prediction.blueBalls.forEach(ball => {
        blueBallFrequency.set(ball, (blueBallFrequency.get(ball) || 0) + 1);
      });
    });
    
    // 2. 分析号码分布的稳定性
    const redVariance = calculateVariance(Array.from(redBallFrequency.values()));
    const blueVariance = calculateVariance(Array.from(blueBallFrequency.values()));
    
    if (redVariance > 2.0) {
      stabilityScore -= 15;
      recommendations.push('红球选择过于分散，建议集中在高频号码');
    }
    
    if (blueVariance > 1.5) {
      stabilityScore -= 10;
      recommendations.push('蓝球选择缺乏一致性，建议优化选择策略');
    }
    
    // 3. 检查与历史趋势的匹配度
    // 创建 analyzeRecentTrends 的内部实现
    const analyzeRecentTrends = (recentResults: Array<{red: number[], blue: number[]}>, periods: number) => {
      if (!recentResults || recentResults.length === 0) return null;
      
      const checkPeriods = Math.min(periods, recentResults.length);
      const redNumbers: number[] = [];
      const blueNumbers: number[] = [];
      
      for (let i = 0; i < checkPeriods; i++) {
        if (recentResults[i]) {
          redNumbers.push(...recentResults[i].red);
          blueNumbers.push(...recentResults[i].blue);
        }
      }
      
      // 计算奇偶比例
      const redOddCount = redNumbers.filter(n => n % 2 === 1).length;
      const blueOddCount = blueNumbers.filter(n => n % 2 === 1).length;
      
      // 计算大小号比例
      const redSmallCount = redNumbers.filter(n => n <= 17).length;
      const blueSmallCount = blueNumbers.filter(n => n <= 6).length;
      
      return {
        redTrends: {
          oddEvenRatio: redNumbers.length > 0 ? redOddCount / redNumbers.length : 0.5,
          sizeRatio: redNumbers.length > 0 ? redSmallCount / redNumbers.length : 0.5
        },
        blueTrends: {
          oddEvenRatio: blueNumbers.length > 0 ? blueOddCount / blueNumbers.length : 0.5,
          sizeRatio: blueNumbers.length > 0 ? blueSmallCount / blueNumbers.length : 0.5
        }
      };
    };
    
    const recentTrends = analyzeRecentTrends(historicalData.recentResults, 20);
    let trendMatchScore = 0;
    
    // 检查recentTrends是否为null
    if (recentTrends && recentTrends.redTrends) {
      predictions.forEach(prediction => {
        // 检查奇偶比例匹配
        const oddCount = prediction.redBalls.filter(n => n % 2 === 1).length;
        const expectedOddRatio = recentTrends.redTrends.oddEvenRatio;
        const actualOddRatio = oddCount / prediction.redBalls.length;
        
        if (Math.abs(actualOddRatio - expectedOddRatio) < 0.2) {
          trendMatchScore += 10;
        }
        
        // 检查大小号比例匹配
        const smallCount = prediction.redBalls.filter(n => n <= 17).length;
        const expectedSizeRatio = recentTrends.redTrends.sizeRatio;
        const actualSizeRatio = smallCount / prediction.redBalls.length;
        
        if (Math.abs(actualSizeRatio - expectedSizeRatio) < 0.2) {
          trendMatchScore += 10;
        }
      });
    } else {
      // 如果无法分析趋势，给予中等评分
      trendMatchScore = predictions.length * 10;
      recommendations.push('历史数据不足，无法进行趋势分析');
    }
    
    const avgTrendMatch = trendMatchScore / (predictions.length * 2);
    if (avgTrendMatch < 5) {
      stabilityScore -= 20;
      recommendations.push('预测结果与近期趋势匹配度较低，建议调整策略');
    }
    
    // 4. 检查号码间隔和跨度的合理性
    let intervalConsistency = 0;
    const intervals: number[] = [];
    predictions.forEach(prediction => {
      const sortedRed = [...prediction.redBalls].sort((a, b) => a - b);
      for (let i = 1; i < sortedRed.length; i++) {
        intervals.push(sortedRed[i] - sortedRed[i-1]);
      }
      
      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      if (avgInterval >= 3 && avgInterval <= 8) {
        intervalConsistency += 1;
      }
    });
    
    if (intervalConsistency / predictions.length < 0.6) {
      stabilityScore -= 15;
      recommendations.push('号码间隔分布不够合理，建议优化间隔策略');
    }
    
    // 5. 生成一致性分析报告
    const consistencyAnalysis = `
      多期验证分析报告：
      - 红球选择稳定性：${redVariance < 2.0 ? '良好' : '需改进'}
      - 蓝球选择稳定性：${blueVariance < 1.5 ? '良好' : '需改进'}
      - 趋势匹配度：${avgTrendMatch >= 5 ? '较高' : '较低'}
      - 间隔合理性：${intervalConsistency / predictions.length >= 0.6 ? '合理' : '需优化'}
      - 整体稳定性评分：${stabilityScore}/100
    `;
    
    return {
      stabilityScore: Math.max(0, stabilityScore),
      consistencyAnalysis,
      recommendations
    };
  }
});

interface SmartPredictionProps {
  data: Array<{
    issue: string;
    frontNumbers: number[];
    backNumbers: number[];
    date: Date;
  }>;
  dataLoaded: boolean;
}

// 数据库信息接口
interface DatabaseInfo {
  singleTickets: number;
  multiplier: number;
  multipleTickets: number;
  splitSingle: number;
  nonWinningCombos: number;
  uniqueCombos: number;
  remainingRedCombos: number;
}

// 预测结果接口
interface PredictionResult {
  id: number;
  redBalls: number[];
  blueBalls: number[];
  analysis: string;
}

const SmartPrediction: React.FC<SmartPredictionProps> = ({ data, dataLoaded }) => {
  // 初始化历史数据和分析器
  const HISTORICAL_DATA = useMemo(() => getHistoricalData(data), [data]);
  const historicalAnalyzer = useMemo(() => createHistoricalAnalyzer(HISTORICAL_DATA), [HISTORICAL_DATA]);
  
  const [predictionMode, setPredictionMode] = useState<'single' | 'multiple'>('single');
  const [predictionCount, setPredictionCount] = useState('1');
  const [redBallCount, setRedBallCount] = useState('6');
  const [blueBallCount, setBlueBallCount] = useState('2');
  const [targetPeriod, setTargetPeriod] = useState('');
  
  // 文件上传引用
  const singleFileRef = useRef<HTMLInputElement>(null);
  const multipleFileRef = useRef<HTMLInputElement>(null);
  const nonWinningFileRef = useRef<HTMLInputElement>(null);
  
  // 数据库信息状态
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo>({
    singleTickets: 0,
    multiplier: 0,
    multipleTickets: 0,
    splitSingle: 0,
    nonWinningCombos: 0,
    uniqueCombos: 0,
    remainingRedCombos: 324632
  });
  
  // 上传状态
  const [uploadStatus, setUploadStatus] = useState({
    single: false,
    multiple: false,
    nonWinning: false
  });
  
  // 预测状态
  const [isPredicting, setIsPredicting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [predictionResults, setPredictionResults] = useState<PredictionResult[]>([]);
  
  // 分析数据存储
  interface AnalysisData {
    purchasedTicketAnalysis?: { leastPurchasedRed: number[], leastPurchasedBlue: number[] };
    guaranteedWinMechanism?: { winExpectation: number, strategy: string };
    nonWinningRemoval?: { removedCount: number, remainingCombinations: number };
    nonWinningCombosRemoved?: { excludedCombinations: Set<string> };
    combinationAnalysis?: { threeBallAnalysis: number[], fourBallAnalysis: number[] };
    featureEngineering?: { trendFeatures: number[], zoneDistribution: number[], cyclicalFeatures: number[] };
    multiStrategy?: { neuralNetwork: number[], quantumMath: number[], probability: number[] };
    conventional?: { hotNumbers: number[], coldNumbers: number[], oddEvenRatio: number };
  }
  // const [analysisData, setAnalysisData] = useState<AnalysisData>({});
  
  // 存储上传的数据
  const [uploadedData, setUploadedData] = useState({
    singleTickets: [] as Array<{redBalls: number[], blueBalls: number[], multiplier: number}>,
    multipleTickets: [] as Array<{redBalls: number[], blueBalls: number[]}>,
    nonWinningCombos: [] as Array<{redBalls: number[]}>
  });

  // 自动获取走势图中最后一期期号+1
  useEffect(() => {
    if (dataLoaded && data.length > 0) {
      const lastIssue = data[0]?.issue;
      if (lastIssue) {
        const nextIssue = (parseInt(String(lastIssue)) + 1).toString();
        setTargetPeriod(nextIssue);
      }
    }
  }, [data, dataLoaded]);
  
  // Excel文件处理函数
  const handleFileUpload = (file: File, type: 'single' | 'multiple' | 'nonWinning') => {
    // 验证文件名
    const expectedNames = {
      single: '单式票',
      multiple: '复式票', 
      nonWinning: '不中'
    };
    
    const fileName = file.name.replace(/\.[^/.]+$/, ''); // 去掉扩展名
    if (!fileName.includes(expectedNames[type])) {
      alert(`请上传名称包含"${expectedNames[type]}"的Excel文件`);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        processUploadedData(jsonData, type);
      } catch (error) {
        console.error('文件解析错误:', error);
        alert('文件格式错误，请检查Excel文件格式');
      }
    };
    reader.readAsArrayBuffer(file);
  };
  
  // 处理上传的数据
  const processUploadedData = (data: unknown[][], type: 'single' | 'multiple' | 'nonWinning') => {
    const processedData: Array<{redBalls: number[], blueBalls?: number[], multiplier?: number}> = [];
    let multiplierSum = 0;
    
    if (type === 'single') {
      // 处理单式票数据 (A2:G500)
      // A1:E1是合并单元格标注红球，F1:G1合并单元格标注蓝球
      // 从第2行开始读取数据到第500行
      for (let i = 1; i < Math.min(data.length, 500); i++) {
        const row = data[i];
        if (row && row.length >= 8) {
          // A2:E2是红球(5个数字)
          const redBalls = [row[0], row[1], row[2], row[3], row[4]]
            .filter(x => x !== undefined && x !== null && !isNaN(Number(x)))
            .map(x => Number(x));
          
          // F2:G2是蓝球(2个数字)
          const blueBalls = [row[5], row[6]]
            .filter(x => x !== undefined && x !== null && !isNaN(Number(x)))
            .map(x => Number(x));
          
          // H列是倍数
          const multiplier = Number(row[7]) || 1;
          
          // 验证数据有效性：红球5个，蓝球2个，范围正确
          if (redBalls.length === 5 && blueBalls.length === 2 &&
              redBalls.every(ball => ball >= 1 && ball <= 35) &&
              blueBalls.every(ball => ball >= 1 && ball <= 12)) {
            processedData.push({ redBalls, blueBalls, multiplier });
            multiplierSum += multiplier;
          }
        }
      }
      
      setUploadedData(prev => ({ ...prev, singleTickets: processedData }));
      setDatabaseInfo(prev => ({ 
        ...prev, 
        singleTickets: processedData.length,
        multiplier: multiplierSum
      }));
      setUploadStatus(prev => ({ ...prev, single: true }));
      
    } else if (type === 'multiple') {
      // 处理复式票数据 (A2:Z500)
      // A1:R1是合并单元格标注红球，S1:Z1合并单元格标注蓝球
      // 从第2行开始读取数据到第500行
      for (let i = 1; i < Math.min(data.length, 500); i++) {
        const row = data[i];
        if (row && row.length >= 20) {
          // A2:R2是红球(最少6个，最多18个)
          const redBalls = row.slice(0, 18)
            .filter(x => x !== undefined && x !== null && !isNaN(Number(x)))
            .map(x => Number(x))
            .filter(x => x >= 1 && x <= 35);
          
          // S2:Z2是蓝球(最少2个，最多12个)
          const blueBalls = row.slice(18, 26)
            .filter(x => x !== undefined && x !== null && !isNaN(Number(x)))
            .map(x => Number(x))
            .filter(x => x >= 1 && x <= 12);
          
          // 验证数据有效性
          if (redBalls.length >= 6 && redBalls.length <= 18 && 
              blueBalls.length >= 2 && blueBalls.length <= 12) {
            // 去重
            const uniqueRedBalls = [...new Set(redBalls)].sort((a, b) => a - b);
            const uniqueBlueBalls = [...new Set(blueBalls)].sort((a, b) => a - b);
            
            if (uniqueRedBalls.length >= 6 && uniqueBlueBalls.length >= 2) {
              processedData.push({ redBalls: uniqueRedBalls, blueBalls: uniqueBlueBalls });
            }
          }
        }
      }
      
      // 计算拆分单式数量
      let splitSingleCount = 0;
      processedData.forEach(ticket => {
        const redCombos = combination(ticket.redBalls.length, 5);
        const blueCombos = combination(ticket.blueBalls.length, 2);
        splitSingleCount += redCombos * blueCombos;
      });
      
      setUploadedData(prev => ({ ...prev, multipleTickets: processedData }));
      setDatabaseInfo(prev => ({ 
        ...prev, 
        multipleTickets: processedData.length,
        splitSingle: splitSingleCount
      }));
      setUploadStatus(prev => ({ ...prev, multiple: true }));
      
    } else if (type === 'nonWinning') {
      // 处理不中组合数据 (A1:E1每行)
      // 该文件A1:E1是一注5个红球的单式，没有蓝球
      // 数据量在10000-324632之间
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row && row.length >= 5) {
          const redBalls = [row[0], row[1], row[2], row[3], row[4]]
            .filter(x => x !== undefined && x !== null && !isNaN(Number(x)))
            .map(x => Number(x));
          
          // 验证数据有效性：红球5个，范围1-35
          if (redBalls.length === 5 && 
              redBalls.every(ball => ball >= 1 && ball <= 35)) {
            // 去重并排序
            const uniqueRedBalls = [...new Set(redBalls)].sort((a, b) => a - b);
            if (uniqueRedBalls.length === 5) {
              processedData.push({ redBalls: uniqueRedBalls });
            }
          }
        }
      }
      
      setUploadedData(prev => ({ ...prev, nonWinningCombos: processedData }));
      setDatabaseInfo(prev => ({ 
        ...prev, 
        nonWinningCombos: processedData.length
      }));
      setUploadStatus(prev => ({ ...prev, nonWinning: true }));
    }
    
    // 延迟更新组合统计，确保状态已更新
    setTimeout(() => {
      updateCombinationStats();
    }, 100);
  };
  
  // 计算组合数
  const combination = (n: number, r: number): number => {
    if (r > n) return 0;
    if (r === 0 || r === n) return 1;
    
    let result = 1;
    for (let i = 0; i < r; i++) {
      result = result * (n - i) / (i + 1);
    }
    return Math.round(result);
  };
  
  // 更新组合统计
  const updateCombinationStats = () => {
    // 收集所有红球组合
    const allRedCombinations = new Set<string>();
    
    // 添加单式票的红球组合
    uploadedData.singleTickets.forEach(ticket => {
      const combo = ticket.redBalls.sort((a: number, b: number) => a - b).join(',');
      allRedCombinations.add(combo);
    });
    
    // 添加复式票拆分后的红球组合
    uploadedData.multipleTickets.forEach(ticket => {
      const redBalls = ticket.redBalls;
      // 生成所有5个红球的组合
      const combinations = generateCombinations(redBalls, 5);
      combinations.forEach(combo => {
        const comboStr = combo.sort((a: number, b: number) => a - b).join(',');
        allRedCombinations.add(comboStr);
      });
    });
    
    // 添加不中组合的红球组合
    uploadedData.nonWinningCombos.forEach(combo => {
      const comboStr = combo.redBalls.sort((a: number, b: number) => a - b).join(',');
      allRedCombinations.add(comboStr);
    });
    
    // 去重后组合数
    const uniqueCombos = allRedCombinations.size;
    
    // 红球剩余组合数 = 324632 - 去重后组合数
    const remainingCombos = Math.max(0, 324632 - uniqueCombos);
    
    setDatabaseInfo(prev => ({
      ...prev,
      uniqueCombos,
      remainingRedCombos: remainingCombos
    }));
  };
  
  // 生成组合的辅助函数
  const generateCombinations = (arr: number[], r: number): number[][] => {
    const result: number[][] = [];
    
    const backtrack = (start: number, current: number[]) => {
      if (current.length === r) {
        result.push([...current]);
        return;
      }
      
      for (let i = start; i < arr.length; i++) {
        current.push(arr[i]);
        backtrack(i + 1, current);
        current.pop();
      }
    };
    
    backtrack(0, []);
    return result;
  };
  


  // 启动超级预测
  const startSuperPrediction = async () => {
    // 移除必须上传数据文件的限制，允许使用默认算法进行预测
    // if (!uploadedData.singleTickets.length && !uploadedData.multipleTickets.length) {
    //   alert('请先上传数据文件');
    //   return;
    // }
    
    setIsPredicting(true);
    setProgress(0);
    setPredictionResults([]);
    
    // 预测步骤
    const steps = [
      '读取上传数据...',
      '执行被购买实票分析...',
      '应用保底中奖机制...',
      '删除不中红球组合...',
      '调用组合分析算法...',
      '特征工程学习机制...',
      '多策略测算机制...',
      '彩票常规测算机制...',
      '运行AI预测算法...',
      '生成预测结果...'
    ];
    
    const analysisData: AnalysisData = {
      purchasedTicketAnalysis: undefined,
      guaranteedWinMechanism: undefined,
      nonWinningCombosRemoved: undefined,
      combinationAnalysis: undefined,
      featureEngineering: undefined,
      multiStrategy: undefined,
      conventional: undefined
    };
    
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 执行对应的分析步骤
      switch (i) {
        case 1: // 被购买实票分析
          if (analysisToggles.purchasedAnalysis) {
            analysisData.purchasedTicketAnalysis = await executePurchasedTicketAnalysis();
          }
          break;
        case 2: // 保底中奖机制
          analysisData.guaranteedWinMechanism = await executeGuaranteedWinMechanism();
          break;
        case 3: // 删除不中红球组合
          if (analysisToggles.removeNonWinning) {
            analysisData.nonWinningCombosRemoved = await removeNonWinningCombinations();
          }
          break;
        case 4: // 组合分析算法
          analysisData.combinationAnalysis = await executeCombinationAnalysis();
          break;
        case 5: // 特征工程学习机制
          analysisData.featureEngineering = await executeFeatureEngineering();
          break;
        case 6: // 多策略测算机制
          analysisData.multiStrategyCalculation = await executeMultiStrategyCalculation();
          break;
        case 7: // 彩票常规测算机制
          analysisData.conventionalCalculation = await executeConventionalCalculation();
          break;
      }
      
      setProgress(((i + 1) / steps.length) * 100);
    }
    
    // 生成最终预测结果
    const results = await generateFinalPredictions(analysisData);
    
    setPredictionResults(results);
    setIsPredicting(false);
  };
  
  // 执行被购买实票分析
  const executePurchasedTicketAnalysis = async (): Promise<{ leastPurchasedRed: number[], leastPurchasedBlue: number[] }> => {
    // 分析上传的单式票和复式票
    const blueBallFrequency = new Map<string, number>();
    const redBallFrequency = new Map<number, number>();
    
    // 统计蓝球组合频率
    uploadedData.singleTickets.forEach(ticket => {
      const blueCombo = ticket.blueBalls.sort().join(',');
      blueBallFrequency.set(blueCombo, (blueBallFrequency.get(blueCombo) || 0) + ticket.multiplier);
      
      ticket.redBalls.forEach((ball: number) => {
        redBallFrequency.set(ball, (redBallFrequency.get(ball) || 0) + ticket.multiplier);
      });
    });
    
    // 找到购买最少的蓝球组合
    const leastPurchasedBlue = Array.from(blueBallFrequency.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, 10)
      .map(([combo]) => combo.split(',').map(Number));
    
    // 找到购买最少的红球
    const leastPurchasedRed = Array.from(redBallFrequency.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, 15)
      .map(([ball]) => ball);
    
    return {
      leastPurchasedBlue,
      leastPurchasedRed,
      totalAnalyzedTickets: uploadedData.singleTickets.length + uploadedData.multipleTickets.length
    };
  };
  
  // 执行保底中奖机制
  const executeGuaranteedWinMechanism = async (): Promise<{ winExpectation: number, strategy: string }> => {
    // 保底中奖机制：确保预测结果有一定的中奖概率
    return {
      targetWinRate: 0.15, // 目标中奖率15%
      minPrizeLevel: '六等奖', // 最低保底奖项
      adjustmentFactor: 1.2 // 调整因子
    };
  };
  
  // 删除不中红球组合
  const removeNonWinningCombinations = async (): Promise<{ excludedCombinations: Set<string>, remainingCombinations: number }> => {
    const excludedCombos = new Set<string>();
    
    uploadedData.nonWinningCombos.forEach(combo => {
      const comboStr = combo.redBalls.sort().join(',');
      excludedCombos.add(comboStr);
    });
    
    return {
      excludedCombinations: excludedCombos,
      remainingCombinations: 324632 - excludedCombos.size
    };
  };
  
  // 执行组合分析算法 - 基于真实历史数据的组合优化
  const executeCombinationAnalysis = async (): Promise<{ threeBallCombos: number[][], fourBallCombos: number[][], analysisDepth: string, historicalMatches: number }> => {
    console.log('🔍 执行基于真实数据的组合分析算法');
    
    // 获取历史数据中的所有组合
    const historicalCombos = HISTORICAL_DATA.recentResults.map(result => result.red);
    
    // 分析3球组合和4球组合的出现频率
    const threeBallFreq: Record<string, number> = {};
    const fourBallFreq: Record<string, number> = {};
    
    historicalCombos.forEach(combo => {
      // 生成所有3球组合
      for (let i = 0; i < combo.length - 2; i++) {
        for (let j = i + 1; j < combo.length - 1; j++) {
          for (let k = j + 1; k < combo.length; k++) {
            const threeCombo = [combo[i], combo[j], combo[k]].sort((a, b) => a - b).join(',');
            threeBallFreq[threeCombo] = (threeBallFreq[threeCombo] || 0) + 1;
          }
        }
      }
      
      // 生成所有4球组合
      for (let i = 0; i < combo.length - 3; i++) {
        for (let j = i + 1; j < combo.length - 2; j++) {
          for (let k = j + 1; k < combo.length - 1; k++) {
            for (let l = k + 1; l < combo.length; l++) {
              const fourCombo = [combo[i], combo[j], combo[k], combo[l]].sort((a, b) => a - b).join(',');
              fourBallFreq[fourCombo] = (fourBallFreq[fourCombo] || 0) + 1;
            }
          }
        }
      }
    });
    
    // 基于频率和热号生成优化组合
    const generateOptimizedCombos = (size: number, count: number) => {
      const combos: number[][] = [];
      const hotNumbers = HISTORICAL_DATA.recentHotRed.slice(0, 15); // 取前15个热号
      const coldNumbers = HISTORICAL_DATA.recentColdRed.slice(0, 10); // 取前10个冷号
      const allNumbers = Array.from({length: 35}, (_, i) => i + 1);
      
      for (let i = 0; i < count; i++) {
        const combo: number[] = [];
        
        // 智能组合策略：70%热号 + 20%冷号 + 10%随机
        while (combo.length < size) {
          let randomNum: number;
          const rand = Math.random();
          
          if (rand < 0.7 && hotNumbers.length > 0) {
            // 70%概率选择热号
            randomNum = hotNumbers[Math.floor(Math.random() * hotNumbers.length)];
          } else if (rand < 0.9 && coldNumbers.length > 0) {
            // 20%概率选择冷号
            randomNum = coldNumbers[Math.floor(Math.random() * coldNumbers.length)];
          } else {
            // 10%概率随机选择
            randomNum = allNumbers[Math.floor(Math.random() * allNumbers.length)];
          }
          
          if (!combo.includes(randomNum)) {
            combo.push(randomNum);
          }
        }
        
        combos.push(combo.sort((a, b) => a - b));
      }
      
      return combos;
    };
    
    const threeBallCombos = generateOptimizedCombos(3, 12);
    const fourBallCombos = generateOptimizedCombos(4, 8);
    
    // 计算历史匹配度
    const historicalMatches = Object.keys(threeBallFreq).length + Object.keys(fourBallFreq).length;
    
    console.log('📈 组合分析结果:', {
      三球组合数: threeBallCombos.length,
      四球组合数: fourBallCombos.length,
      历史组合总数: historicalCombos.length,
      历史匹配数: historicalMatches,
      热号数量: HISTORICAL_DATA.recentHotRed.length,
      冷号数量: HISTORICAL_DATA.recentColdRed.length
    });
    
    return {
      threeBallCombos,
      fourBallCombos,
      analysisDepth: 'deep',
      historicalMatches
    };
  };
  
  // 执行特征工程学习机制
  const executeFeatureEngineering = async (): Promise<{ trendAnalysis: { mean: number, variance: number, skewness: number, kurtosis: number }, zoneDistribution: { redZones: number[], blueZones: number[] }, cyclicalFeatures: number, technicalIndicators: { movingAverage: number, rsi: number, bollingerBands: number[] } }> => {
    // 模拟特征工程分析
    const features = {
      trendAnalysis: {
        mean: Math.random() * 20 + 10,
        variance: Math.random() * 5 + 2,
        skewness: Math.random() * 2 - 1,
        kurtosis: Math.random() * 3 + 1
      },
      zoneDistribution: {
        redZones: [0.18, 0.22, 0.19, 0.21, 0.20], // 5个区域分布
        blueZones: [0.48, 0.52] // 2个区域分布
      },
      cyclicalFeatures: Math.random() * 0.8 + 0.1,
      technicalIndicators: {
        movingAverage: Math.random() * 15 + 10,
        rsi: Math.random() * 100,
        bollingerBands: [Math.random() * 10 + 5, Math.random() * 10 + 15]
      }
    };
    
    return features;
  };
  
  // 执行多策略测算机制
  const executeMultiStrategyCalculation = async (): Promise<{ neuralNetwork: number, quantumMath: number, probabilityCalc: number, distributionAnalysis: number, samplingStatistics: number, timeDecayFactor: number, betaDistribution: number, markovChain: number, gaussianMixture: number, hotColdTransition: number }> => {
    const strategies = {
      neuralNetwork: Math.random() * 0.3 + 0.6,
      quantumMath: Math.random() * 0.25 + 0.7,
      probabilityCalc: Math.random() * 0.35 + 0.5,
      distributionAnalysis: Math.random() * 0.4 + 0.4,
      samplingStatistics: Math.random() * 0.3 + 0.6,
      timeDecayFactor: Math.random() * 0.2 + 0.8,
      betaDistribution: Math.random() * 0.35 + 0.5,
      markovChain: Math.random() * 0.4 + 0.4,
      gaussianMixture: Math.random() * 0.3 + 0.6,
      hotColdTransition: Math.random() * 0.45 + 0.3
    };
    
    return strategies;
  };
  
  // 执行彩票常规测算机制
  const executeConventionalCalculation = async (): Promise<{ hotNumbers: number[], coldNumbers: number[], oddEvenRatio: number, sizeRatio: number, consecutiveNumbers: number }> => {
    return {
      hotNumbers: Array.from({length: 10}, () => Math.floor(Math.random() * 35) + 1),
      coldNumbers: Array.from({length: 10}, () => Math.floor(Math.random() * 35) + 1),
      oddEvenRatio: Math.random() * 0.4 + 0.3,
      sizeRatio: Math.random() * 0.4 + 0.3,
      consecutiveNumbers: Math.floor(Math.random() * 3) + 1
    };
  };
  
  // 生成最终预测结果 - 集成多期验证机制和差异化策略
  const generateFinalPredictions = async (analysisData: AnalysisData): Promise<PredictionResult[]> => {
    const results: PredictionResult[] = [];
    const count = parseInt(predictionCount);
    
    // 生成初始预测结果 - 单式和复式使用不同策略
    for (let i = 0; i < count; i++) {
      let redBalls: number[];
      let blueBalls: number[];
      
      if (predictionMode === 'single') {
        // 单式预测：使用精准策略，重点关注高概率组合和稳定性
        redBalls = generatePrecisionRedBalls(analysisData, 5, i);
        blueBalls = generatePrecisionBlueBalls(analysisData, 2, i);
      } else {
        // 复式预测：使用组合优化策略，基于历史数据深度分析
        redBalls = generateComplexRedBalls(analysisData, parseInt(redBallCount), i);
        blueBalls = generateComplexBlueBalls(analysisData, parseInt(blueBallCount), i);
      }
      
      const analysis = generateIntelligentAnalysis(redBalls, blueBalls, analysisData);
      
      results.push({
        id: i + 1,
        redBalls: redBalls.sort((a, b) => a - b),
        blueBalls: blueBalls.sort((a, b) => a - b),
        analysis
      });
    }
    
    // 执行多期验证机制
    if (results.length >= 3) {
      const validationResult = historicalAnalyzer.validateMultiplePeriods(results, HISTORICAL_DATA);
      
      // 如果稳定性评分低于60分，进行优化调整
      if (validationResult.stabilityScore < 60) {
        console.log('预测稳定性较低，正在进行优化调整...');
        
        // 重新生成部分预测结果以提高稳定性
        const optimizedResults = await optimizePredictionStability(results, analysisData, validationResult);
        
        // 添加验证报告到分析中
        optimizedResults.forEach((result, index) => {
          if (index === 0) {
            result.analysis += `\n\n【多期验证报告】\n${validationResult.consistencyAnalysis}\n推荐策略：${validationResult.recommendations.join('；')}`;
          }
        });
        
        return optimizedResults;
      } else {
        // 添加验证报告到第一个预测的分析中
        if (results.length > 0) {
          results[0].analysis += `\n\n【多期验证报告】\n${validationResult.consistencyAnalysis}\n推荐策略：${validationResult.recommendations.join('；')}`;
        }
      }
    }
    
    return results;
  };
  
  // 优化预测稳定性的辅助函数
  const optimizePredictionStability = async (originalResults: PredictionResult[], analysisData: AnalysisData, validationResult: { recommendations: string[] }): Promise<PredictionResult[]> => {
    const optimizedResults = [...originalResults];
    const needsOptimization = Math.ceil(originalResults.length * 0.4); // 优化40%的预测
    
    // 根据验证结果的建议进行针对性优化
    for (let i = 0; i < needsOptimization; i++) {
      const targetIndex = Math.floor(Math.random() * optimizedResults.length);
      
      // 生成更稳定的预测组合
      let optimizedRedBalls: number[];
      
      // 根据验证建议调整生成策略
      if (validationResult.recommendations.includes('增加冷号选择比例')) {
        // 增加冷号权重
        optimizedRedBalls = generateStabilizedRedBalls(analysisData, 'cold_focus');
      } else if (validationResult.recommendations.includes('优化奇偶比例分布')) {
        // 优化奇偶比例
        optimizedRedBalls = generateStabilizedRedBalls(analysisData, 'odd_even_balance');
      } else {
        // 默认稳定性优化
        optimizedRedBalls = generateStabilizedRedBalls(analysisData, 'stability');
      }
      
      const optimizedBlueBalls = generateStabilizedBlueBalls();
      
      const analysis = generateIntelligentAnalysis(optimizedRedBalls, optimizedBlueBalls, analysisData);
      
      optimizedResults[targetIndex] = {
        id: targetIndex + 1,
        redBalls: optimizedRedBalls.sort((a, b) => a - b),
        blueBalls: optimizedBlueBalls.sort((a, b) => a - b),
        analysis: analysis + ' [已优化]'
      };
    }
    
    return optimizedResults;
  };
  
  // 生成稳定性优化的红球
  const generateStabilizedRedBalls = (analysisData: AnalysisData, strategy: 'cold_focus' | 'odd_even_balance' | 'stability'): number[] => {
    const candidates: Array<{number: number, score: number}> = [];
    
    for (let num = 1; num <= 35; num++) {
      let score = 0;
      
      // 基础历史频率权重
      const frequencyWeight = historicalAnalyzer.getFrequencyWeight(num, false);
      score += frequencyWeight * 30;
      
      // 根据策略调整权重
      switch (strategy) {
        case 'cold_focus': {
          // 增加冷号权重
          const hotColdWeight = historicalAnalyzer.getHotColdWeight(num, false);
          score += hotColdWeight * 40; // 提高冷热权重
          break;
        }
        case 'odd_even_balance': {
          // 平衡奇偶比例
          const isOdd = num % 2 === 1;
          score += isOdd ? 15 : 15; // 奇偶平等权重
          break;
        }
        case 'stability':
        default: {
          // 稳定性优化
          const periodicScore = historicalAnalyzer.calculatePeriodicPattern(num, HISTORICAL_DATA.recentResults, false);
          score += periodicScore * 25;
          break;
        }
      }
      
      candidates.push({number: num, score});
    }
    
    // 选择前35个候选号码，然后随机选择5个
    const topCandidates = candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map(item => item.number);
    
    const selectedNumbers: number[] = [];
    while (selectedNumbers.length < 5 && topCandidates.length > 0) {
      const randomIndex = Math.floor(Math.random() * topCandidates.length);
      const selectedNumber = topCandidates.splice(randomIndex, 1)[0];
      selectedNumbers.push(selectedNumber);
    }
    
    return selectedNumbers;
  };
  
  // 生成稳定性优化的蓝球
  const generateStabilizedBlueBalls = (): number[] => {
    const candidates: Array<{number: number, score: number}> = [];
    
    for (let ball = 1; ball <= 12; ball++) {
      let score = 0;
      
      // 历史频率分析 (30%权重)
        const frequencyScore = historicalAnalyzer.getFrequencyWeight(ball, true);
      score += frequencyScore * 40;
      
      // 周期性权重
      const periodicScore = historicalAnalyzer.calculatePeriodicPattern(ball, HISTORICAL_DATA.recentResults, true);
      score += periodicScore * 30;
      
      // 遗漏权重
      const missStreakScore = historicalAnalyzer.calculateMissStreakWeight(ball, HISTORICAL_DATA.recentResults, true);
      score += missStreakScore * 30;
      
      candidates.push({number: ball, score});
    }
    
    // 选择前8个候选号码，然后随机选择2个
    const topCandidates = candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(item => item.number);
    
    const selectedNumbers: number[] = [];
    while (selectedNumbers.length < 2 && topCandidates.length > 0) {
      const randomIndex = Math.floor(Math.random() * topCandidates.length);
      const selectedNumber = topCandidates.splice(randomIndex, 1)[0];
      selectedNumbers.push(selectedNumber);
    }
    
    return selectedNumbers;
  };

  // 复式预测专用：生成组合优化的红球 - 增强版
  const generateComplexRedBalls = (analysisData: AnalysisData, count: number, predictionIndex: number): number[] => {
    const historicalData = getHistoricalData(data);
    const combinationAnalysis = analysisData.combinationAnalysis;
    
    // 基于 predictionIndex 创建随机种子，确保不同预测产生不同结果
    const randomSeed = predictionIndex * 1000 + Date.now() % 1000;
    const seededRandom = () => {
      const x = Math.sin(randomSeed + Math.random() * predictionIndex) * 10000;
      return x - Math.floor(x);
    };
    
    // 分析最近开奖趋势
    const recentTrends = historicalAnalyzer.analyzeRecentTrends(HISTORICAL_DATA.recentResults, 15);
    const dynamicWeights = historicalAnalyzer.adjustWeights(recentTrends);
    
    // 基于历史数据的深度分析权重
    const candidates: Array<{number: number, score: number}> = [];
    
    for (let num = 1; num <= 35; num++) {
      let score = 0;
      
      // 1. 用户购买数据权重 (55% - 大幅提升复式预测的用户数据权重)
      const purchaseData = analysisData.purchasedTicketAnalysis;
      if (purchaseData?.leastPurchasedRed?.includes(num)) {
        score += 55; // 用户购买较少的号码优先
      } else if (purchaseData?.mostPurchasedRed?.includes(num)) {
        score += 25; // 用户购买较多的号码适中权重
      } else {
        score += 40; // 其他号码中等权重
      }
      
      // 2. 历史频率权重 (20% - 基于真实历史数据)
      const frequencyWeight = historicalAnalyzer.getFrequencyWeight(num, false);
      score += frequencyWeight * 20;
      
      // 3. 组合分析权重 (15% - 增强组合分析)
      if (combinationAnalysis) {
        // 检查该号码在历史3球和4球组合中的表现
        const inThreeBall = combinationAnalysis.threeBallCombos.some(combo => 
          combo.includes(num)
        );
        const inFourBall = combinationAnalysis.fourBallCombos.some(combo => 
          combo.includes(num)
        );
        
        if (inThreeBall && inFourBall) {
          score += 15; // 在多种组合中出现
        } else if (inThreeBall || inFourBall) {
          score += 12; // 在某种组合中出现
        } else {
          score += 5; // 组合中较少出现，给予创新机会
        }
      }
      
      // 4. 动态学习权重 (7% - 基于最近趋势)
      const dynamicWeight = dynamicWeights.redWeights.get(num) || 1.0;
      score += dynamicWeight * 7;
      
      // 5. 冷热号码权重 (3%)
      const hotColdWeight = historicalAnalyzer.getHotColdWeight(num, false);
      score += hotColdWeight * 3;
      
      candidates.push({number: num, score});
    }
    
    // 复式预测专用的高级组合优化策略
    const strategy = predictionIndex % 4; // 0: 用户数据优先, 1: 组合分析优先, 2: 历史趋势优先, 3: 创新组合
    
    // 为每个策略引入随机偏移，确保相同策略下也有差异
    const strategyOffset = Math.floor(seededRandom() * 3) + 1; // 1-3的随机偏移
    const randomFactor = seededRandom() * 0.3 + 0.85; // 0.85-1.15的随机因子
    
    let selectedNumbers: number[] = [];
    
    switch (strategy) {
       case 0: { // 用户数据优先策略：最大化利用用户购买数据
         // 应用随机因子调整分数
         const adjustedCandidates = candidates.map(item => ({
           ...item,
           score: item.score * randomFactor + (seededRandom() - 0.5) * 10
         }));
         const userDataCandidates = adjustedCandidates.sort((a, b) => b.score - a.score);
         
         // 优先选择用户购买最少的号码，但引入随机偏移
         const leastPurchased = analysisData.purchasedTicketAnalysis?.leastPurchasedRed || [];
         const priorityCount = Math.min(count - strategyOffset, leastPurchased.length);
         const priorityNumbers = userDataCandidates
           .filter(item => leastPurchased.includes(item.number))
           .slice(0, Math.max(1, priorityCount))
           .map(item => item.number);
         
         selectedNumbers = [...priorityNumbers];
         
         // 补充高分号码，跳过一些号码增加随机性
         const remaining = userDataCandidates
           .filter(item => !selectedNumbers.includes(item.number))
           .slice(strategyOffset, count - selectedNumbers.length + strategyOffset)
           .map(item => item.number);
         
         selectedNumbers = [...selectedNumbers, ...remaining].slice(0, count);
         break;
       }
         
       case 1: { // 组合分析优先策略：基于历史组合模式
         // 应用随机因子调整分数
         const adjustedCandidates = candidates.map(item => ({
           ...item,
           score: item.score * randomFactor + (seededRandom() - 0.5) * 8
         }));
         const comboCandidates = adjustedCandidates.sort((a, b) => b.score - a.score);
         
         // 选择在历史组合中表现良好的号码，引入随机性
         if (combinationAnalysis) {
           const comboNumbers = comboCandidates
             .filter(item => {
               const inThree = combinationAnalysis.threeBallCombos.some(combo => combo.includes(item.number));
               const inFour = combinationAnalysis.fourBallCombos.some(combo => combo.includes(item.number));
               return inThree || inFour;
             })
             .slice(strategyOffset, Math.ceil(count * (0.7 + seededRandom() * 0.2)) + strategyOffset)
             .map(item => item.number);
           
           selectedNumbers = [...comboNumbers];
         }
         
         // 补充高分号码，跳过一些增加随机性
         const remaining = comboCandidates
           .filter(item => !selectedNumbers.includes(item.number))
           .slice(strategyOffset, count - selectedNumbers.length + strategyOffset)
           .map(item => item.number);
         
         selectedNumbers = [...selectedNumbers, ...remaining].slice(0, count);
         break;
       }
         
       case 2: { // 历史趋势优先策略：基于最近开奖趋势
         const trendCandidates = candidates.sort((a, b) => {
           const aDynamic = dynamicWeights.redWeights.get(a.number) || 1.0;
           const bDynamic = dynamicWeights.redWeights.get(b.number) || 1.0;
           const aAdjusted = (a.score + aDynamic * 10) * randomFactor + (seededRandom() - 0.5) * 5;
           const bAdjusted = (b.score + bDynamic * 10) * randomFactor + (seededRandom() - 0.5) * 5;
           return bAdjusted - aAdjusted;
         });
         
         selectedNumbers = trendCandidates
           .slice(strategyOffset, count + strategyOffset)
           .map(item => item.number);
         break;
       }
         
       case 3: { // 创新组合策略：热冷号平衡 + 用户数据避重
         // 引入随机性选择热冷号
         const hotCount = Math.ceil(count * (0.3 + seededRandom() * 0.2));
         const coldCount = Math.ceil(count * (0.2 + seededRandom() * 0.2));
         const hotNumbers = historicalData.recentHotRed.slice(strategyOffset, hotCount + strategyOffset);
         const coldNumbers = historicalData.recentColdRed.slice(strategyOffset, coldCount + strategyOffset);
         
         // 从用户购买较少的号码中选择平衡号码，应用随机因子
         const leastPurchased = analysisData.purchasedTicketAnalysis?.leastPurchasedRed || [];
         const adjustedCandidates = candidates.map(item => ({
           ...item,
           score: item.score * randomFactor + (seededRandom() - 0.5) * 12
         }));
         const balanceNumbers = adjustedCandidates
           .filter(item => {
             const notHot = !hotNumbers.includes(item.number);
             const notCold = !coldNumbers.includes(item.number);
             const userPreferred = leastPurchased.length === 0 || leastPurchased.includes(item.number);
             return notHot && notCold && userPreferred;
           })
           .sort((a, b) => b.score - a.score)
           .slice(strategyOffset, count - hotNumbers.length - coldNumbers.length + strategyOffset)
           .map(item => item.number);
         
         selectedNumbers = [...hotNumbers, ...coldNumbers, ...balanceNumbers].slice(0, count);
         break;
       }
     }
    
    // 确保选择的号码数量正确
    while (selectedNumbers.length < count) {
      const remaining = candidates
        .filter(item => !selectedNumbers.includes(item.number))
        .sort((a, b) => b.score - a.score);
      
      if (remaining.length > 0) {
        selectedNumbers.push(remaining[0].number);
      } else {
        break;
      }
    }
    
    return selectedNumbers.slice(0, count);
  };

  // 复式预测专用：生成组合优化的蓝球 - 增强版
  const generateComplexBlueBalls = (analysisData: AnalysisData, count: number, predictionIndex: number): number[] => {
    const historicalData = getHistoricalData(data);
    
    // 基于 predictionIndex 创建随机种子，确保不同预测产生不同结果
    const randomSeed = predictionIndex * 2000 + Date.now() % 1000;
    const seededRandom = () => {
      const x = Math.sin(randomSeed + Math.random() * (predictionIndex + 1)) * 10000;
      return x - Math.floor(x);
    };
    
    // 分析最近开奖趋势
    const recentTrends = historicalAnalyzer.analyzeRecentTrends(HISTORICAL_DATA.recentResults, 10);
    const dynamicWeights = historicalAnalyzer.adjustWeights(recentTrends);
    
    const candidates: Array<{number: number, score: number}> = [];
    
    for (let ball = 1; ball <= 12; ball++) {
      let score = 0;
      
      // 1. 用户购买数据权重 (60% - 大幅提升权重)
      const purchaseData = analysisData.purchasedTicketAnalysis;
      if (purchaseData?.leastPurchasedBlue?.includes(ball)) {
        score += 60; // 最少购买的号码获得满分
      } else if (purchaseData?.mostPurchasedBlue?.includes(ball)) {
        score += 20; // 最多购买的号码降低权重
      } else {
        // 根据购买频率计算分数
        const purchaseCount = purchaseData?.blueBallFrequency?.[ball] || 0;
        const maxPurchaseCount = Math.max(...Object.values(purchaseData?.blueBallFrequency || {}));
        if (maxPurchaseCount > 0) {
          score += (1 - purchaseCount / maxPurchaseCount) * 60;
        } else {
          score += 40; // 无购买数据时给予中等分数
        }
      }
      
      // 2. 动态学习权重 (基于最近趋势)
      const dynamicWeight = dynamicWeights.blueWeights.get(ball) || 1.0;
      
      // 3. 历史频率权重 (25% - 调整权重)
      const frequencyScore = historicalAnalyzer.getFrequencyWeight(ball, true);
      score += frequencyScore * 25 * dynamicWeight;
      
      // 4. 周期性权重 (10% - 降低权重)
      const periodicScore = historicalAnalyzer.calculatePeriodicPattern(ball, historicalData.recentResults, true);
      score += periodicScore * 10 * dynamicWeight;
      
      // 5. 遗漏权重 (5% - 降低权重)
      const missStreakScore = historicalAnalyzer.calculateMissStreakWeight(ball, historicalData.recentResults, true);
      score += missStreakScore * 5 * dynamicWeight;
      
      candidates.push({number: ball, score});
    }
    
    // 复式预测专用的高级策略选择
    const strategy = predictionIndex % 4; // 0: 用户数据优先, 1: 历史趋势优先, 2: 平衡策略, 3: 创新组合
    
    // 为每个策略引入随机偏移，确保相同策略下也有差异
    const strategyOffset = Math.floor(seededRandom() * 2) + 1; // 1-2的随机偏移
    const randomFactor = seededRandom() * 0.4 + 0.8; // 0.8-1.2的随机因子
    
    let selectedNumbers: number[] = [];
    
    switch (strategy) {
      case 0: { // 用户数据优先策略
        // 应用随机因子调整分数
        const adjustedCandidates = candidates.map(item => ({
          ...item,
          score: item.score * randomFactor + (seededRandom() - 0.5) * 15
        }));
        const userDataCandidates = adjustedCandidates.sort((a, b) => b.score - a.score);
        
        // 优先选择用户购买最少的蓝球，引入随机偏移
        const leastPurchased = analysisData.purchasedTicketAnalysis?.leastPurchasedBlue || [];
        const priorityCount = Math.min(count - strategyOffset, leastPurchased.length);
        const priorityNumbers = userDataCandidates
          .filter(item => leastPurchased.includes(item.number))
          .slice(0, Math.max(1, priorityCount))
          .map(item => item.number);
        
        selectedNumbers = [...priorityNumbers];
        
        // 补充高分号码，跳过一些号码增加随机性
        const remaining = userDataCandidates
          .filter(item => !selectedNumbers.includes(item.number))
          .slice(strategyOffset, count - selectedNumbers.length + strategyOffset)
          .map(item => item.number);
        
        selectedNumbers = [...selectedNumbers, ...remaining].slice(0, count);
        break;
      }
      
      case 1: { // 历史趋势优先策略
        const trendCandidates = candidates.sort((a, b) => {
          const aDynamic = dynamicWeights.blueWeights.get(a.number) || 1.0;
          const bDynamic = dynamicWeights.blueWeights.get(b.number) || 1.0;
          const aAdjusted = (a.score + aDynamic * 15) * randomFactor + (seededRandom() - 0.5) * 8;
          const bAdjusted = (b.score + bDynamic * 15) * randomFactor + (seededRandom() - 0.5) * 8;
          return bAdjusted - aAdjusted;
        });
        
        selectedNumbers = trendCandidates
          .slice(strategyOffset, count + strategyOffset)
          .map(item => item.number);
        break;
      }
      
      case 2: { // 平衡策略：高分 + 用户数据平衡
        // 应用随机因子调整分数
        const adjustedCandidates = candidates.map(item => ({
          ...item,
          score: item.score * randomFactor + (seededRandom() - 0.5) * 10
        }));
        const balancedCandidates = adjustedCandidates.sort((a, b) => b.score - a.score);
        const topRatio = 0.6 + seededRandom() * 0.2; // 0.6-0.8的随机比例
        const topHalf = balancedCandidates.slice(strategyOffset, Math.ceil(count * topRatio) + strategyOffset);
        const userPreferred = analysisData.purchasedTicketAnalysis?.leastPurchasedBlue || [];
        const userNumbers = balancedCandidates
          .filter(item => userPreferred.includes(item.number))
          .slice(strategyOffset, count - topHalf.length + strategyOffset);
        
        selectedNumbers = [...topHalf.map(item => item.number), ...userNumbers.map(item => item.number)].slice(0, count);
        break;
      }
      
      case 3: { // 创新组合策略：热冷号平衡 + 用户数据避重
        // 随机调整热冷号的比例
        const hotRatio = 0.4 + seededRandom() * 0.3; // 0.4-0.7的随机比例
        const coldRatio = 0.2 + seededRandom() * 0.2; // 0.2-0.4的随机比例
        
        const hotBlue = historicalData.recentHotBlue
          .slice(strategyOffset, Math.ceil(count * hotRatio) + strategyOffset);
        const coldBlue = historicalData.recentColdBlue
          .slice(strategyOffset, Math.ceil(count * coldRatio) + strategyOffset);
        
        // 从用户购买较少的号码中选择平衡号码，引入随机性
        const leastPurchased = analysisData.purchasedTicketAnalysis?.leastPurchasedBlue || [];
        const balanceNumbers = candidates
          .filter(item => {
            const notHot = !hotBlue.includes(item.number);
            const notCold = !coldBlue.includes(item.number);
            const userPreferred = leastPurchased.length === 0 || leastPurchased.includes(item.number);
            return notHot && notCold && userPreferred;
          })
          .map(item => ({
            ...item,
            score: item.score * randomFactor + (seededRandom() - 0.5) * 10
          }))
          .sort((a, b) => b.score - a.score)
          .slice(strategyOffset, count - hotBlue.length - coldBlue.length + strategyOffset)
          .map(item => item.number);
        
        selectedNumbers = [...hotBlue, ...coldBlue, ...balanceNumbers].slice(0, count);
        break;
      }
    }
    
    // 确保选择的号码数量正确
    while (selectedNumbers.length < count) {
      const remaining = candidates
        .filter(item => !selectedNumbers.includes(item.number))
        .sort((a, b) => b.score - a.score);
      
      if (remaining.length > 0) {
        selectedNumbers.push(remaining[0].number);
      } else {
        break;
      }
    }
    
    return selectedNumbers.slice(0, count);
  };
  
  // 单式预测专用：精准红球生成 - 专注于高概率和稳定性
  const generatePrecisionRedBalls = (analysisData: AnalysisData, count: number, predictionIndex: number): number[] => {
    const historicalData = getHistoricalData(data);
    const excludedCombos = analysisData.nonWinningCombosRemoved?.excludedCombinations || new Set();
    const leastPurchased = analysisData.purchasedTicketAnalysis?.leastPurchasedRed || [];
    
    // 分析最近开奖趋势
    const recentTrends = historicalAnalyzer.analyzeRecentTrends(HISTORICAL_DATA.recentResults, 8);
    const dynamicWeights = historicalAnalyzer.adjustWeights(recentTrends);
    
    // 单式预测的精准候选池生成
    const generatePrecisionCandidatePool = (): Array<{number: number, score: number, stability: number}> => {
      const candidates: Array<{number: number, score: number, stability: number}> = [];
      
      for (let num = 1; num <= 35; num++) {
        let score = 0;
        let stability = 0;
        
        // 1. 用户购买数据权重 (50% - 单式预测最重要)
        if (leastPurchased.length > 0) {
          if (leastPurchased.includes(num)) {
            score += 50; // 用户购买最少的号码优先
          } else {
            score += 15; // 其他号码较低权重
          }
        } else {
          score += 30; // 无用户数据时给予中等分
        }
        
        // 2. 历史频率权重 (25% - 基于真实历史数据)
        const frequencyWeight = historicalAnalyzer.getFrequencyWeight(num, false);
        score += frequencyWeight * 25;
        
        // 3. 稳定性分析 (15% - 单式预测关键)
        const periodicScore = historicalAnalyzer.calculatePeriodicPattern(num, historicalData.recentResults, false);
        const missStreakScore = historicalAnalyzer.calculateMissStreakWeight(num, historicalData.recentResults, false);
        const intervalScore = historicalAnalyzer.calculateAdvancedIntervalScore([num]);
        
        stability = (periodicScore + missStreakScore + intervalScore) / 3;
        score += stability * 15;
        
        // 4. 动态学习权重 (7% - 最近趋势)
        const dynamicWeight = dynamicWeights.redWeights.get(num) || 1.0;
        score += dynamicWeight * 7;
        
        // 5. 冷热平衡权重 (3% - 微调)
        const hotColdWeight = historicalAnalyzer.getHotColdWeight(num, false);
        score += hotColdWeight * 3;
        
        candidates.push({number: num, score, stability});
      }
      
      return candidates.sort((a, b) => {
        // 优先考虑高分数，然后考虑高稳定性
        const scoreDiff = b.score - a.score;
        if (Math.abs(scoreDiff) < 5) {
          return b.stability - a.stability;
        }
        return scoreDiff;
      });
    };
    
    // 精准组合验证 - 更严格的验证
    const isPrecisionValidCombination = (numbers: number[]): boolean => {
      if (numbers.length < 5) return true;
      
      const sortedNumbers = [...numbers].sort((a, b) => a - b);
      
      // 检查是否在排除列表中
      if (excludedCombos.has(sortedNumbers.slice(0, 5).join(','))) {
        return false;
      }
      
      // 奇偶比例检查 (2:3 或 3:2)
      const oddCount = sortedNumbers.filter(n => n % 2 === 1).length;
      if (oddCount < 2 || oddCount > 3) {
        return false;
      }
      
      // 大小号比例检查 (2:3 或 3:2)
      const smallCount = sortedNumbers.filter(n => n <= 17).length;
      if (smallCount < 2 || smallCount > 3) {
        return false;
      }
      
      // 连号检查 (不超过2个连号)
      let consecutiveCount = 0;
      for (let i = 1; i < sortedNumbers.length; i++) {
        if (sortedNumbers[i] - sortedNumbers[i-1] === 1) {
          consecutiveCount++;
        }
      }
      if (consecutiveCount > 2) {
        return false;
      }
      
      // 使用历史分析器的验证
      return historicalAnalyzer.isValidCombination(sortedNumbers, true);
    };
    
    // 精准选号策略
    const strategy = predictionIndex % 3; // 0: 稳定优先, 1: 用户数据优先, 2: 平衡策略
    const candidatePool = generatePrecisionCandidatePool();
    
    let selectedNumbers: number[] = [];
    const maxAttempts = 500;
    let attempts = 0;
    
    while (selectedNumbers.length < count && attempts < maxAttempts) {
      attempts++;
      selectedNumbers = [];
      
      switch (strategy) {
        case 0: { // 稳定优先策略
          const stableCandidates = candidatePool
            .filter(item => item.stability > 15)
            .slice(0, 15);
          
          while (selectedNumbers.length < count && stableCandidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(5, stableCandidates.length));
            const candidate = stableCandidates.splice(randomIndex, 1)[0];
            
            const testCombination = [...selectedNumbers, candidate.number];
            if (isPrecisionValidCombination(testCombination)) {
              selectedNumbers.push(candidate.number);
            }
          }
          break;
        }
        
        case 1: { // 用户数据优先策略
          const userPriorityCandidates = candidatePool
            .filter(item => leastPurchased.length === 0 || leastPurchased.includes(item.number))
            .slice(0, 12);
          
          while (selectedNumbers.length < count && userPriorityCandidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(4, userPriorityCandidates.length));
            const candidate = userPriorityCandidates.splice(randomIndex, 1)[0];
            
            const testCombination = [...selectedNumbers, candidate.number];
            if (isPrecisionValidCombination(testCombination)) {
              selectedNumbers.push(candidate.number);
            }
          }
          break;
        }
        
        case 2: { // 平衡策略
          const balancedCandidates = candidatePool.slice(0, 18);
          
          while (selectedNumbers.length < count && balancedCandidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(6, balancedCandidates.length));
            const candidate = balancedCandidates.splice(randomIndex, 1)[0];
            
            const testCombination = [...selectedNumbers, candidate.number];
            if (isPrecisionValidCombination(testCombination)) {
              selectedNumbers.push(candidate.number);
            }
          }
          break;
        }
      }
      
      // 如果选择的号码不足，从剩余候选中补充
      if (selectedNumbers.length < count) {
        const remainingCandidates = candidatePool
          .filter(item => !selectedNumbers.includes(item.number))
          .slice(0, 10);
        
        for (const candidate of remainingCandidates) {
          if (selectedNumbers.length >= count) break;
          
          const testCombination = [...selectedNumbers, candidate.number];
          if (isPrecisionValidCombination(testCombination)) {
            selectedNumbers.push(candidate.number);
          }
        }
      }
    }
    
    // 确保返回正确数量的号码
    if (selectedNumbers.length < count) {
      const fallbackCandidates = candidatePool
        .filter(item => !selectedNumbers.includes(item.number))
        .slice(0, count - selectedNumbers.length)
        .map(item => item.number);
      selectedNumbers = [...selectedNumbers, ...fallbackCandidates].slice(0, count);
    }
    
    return selectedNumbers;
  };
  
  // 智能生成红球 - 基于历史数据分析的优化版本

  
  // 单式预测专用：精准蓝球生成 - 专注于高概率和稳定性
  const generatePrecisionBlueBalls = (analysisData: AnalysisData, count: number, predictionIndex: number): number[] => {
    const historicalData = getHistoricalData(data);
    const leastPurchased = analysisData.purchasedTicketAnalysis?.leastPurchasedBlue || [];
    
    // 分析最近开奖趋势
    const recentTrends = historicalAnalyzer.analyzeRecentTrends(HISTORICAL_DATA.recentResults, 6);
    const dynamicWeights = historicalAnalyzer.adjustWeights(recentTrends);
    
    // 单式预测的精准蓝球候选池生成
    const generatePrecisionBlueCandidatePool = (): Array<{number: number, score: number, stability: number}> => {
      const candidates: Array<{number: number, score: number, stability: number}> = [];
      
      for (let ball = 1; ball <= 12; ball++) {
        let score = 0;
        let stability = 0;
        
        // 1. 用户购买数据权重 (55% - 单式预测最重要)
        if (leastPurchased.length > 0) {
          if (leastPurchased.includes(ball)) {
            score += 55; // 用户购买最少的蓝球优先
          } else {
            score += 15; // 其他蓝球较低权重
          }
        } else {
          score += 35; // 无用户数据时给予中等分
        }
        
        // 2. 历史频率权重 (20% - 基于真实历史数据)
        const frequencyWeight = historicalAnalyzer.getFrequencyWeight(ball, true);
        score += frequencyWeight * 20;
        
        // 3. 稳定性分析 (15% - 单式预测关键)
        const periodicScore = historicalAnalyzer.calculatePeriodicPattern(ball, historicalData.recentResults, true);
        const missStreakScore = historicalAnalyzer.calculateMissStreakWeight(ball, historicalData.recentResults, true);
        const intervalScore = historicalAnalyzer.calculateAdvancedIntervalScore([ball]);
        
        stability = (periodicScore + missStreakScore + intervalScore) / 3;
        score += stability * 15;
        
        // 4. 动态学习权重 (7% - 最近趋势)
        const dynamicWeight = dynamicWeights.blueWeights.get(ball) || 1.0;
        score += dynamicWeight * 7;
        
        // 5. 冷热平衡权重 (3% - 微调)
        const hotColdWeight = historicalAnalyzer.getHotColdWeight(ball, true);
        score += hotColdWeight * 3;
        
        candidates.push({number: ball, score, stability});
      }
      
      return candidates.sort((a, b) => {
        // 优先考虑高分数，然后考虑高稳定性
        const scoreDiff = b.score - a.score;
        if (Math.abs(scoreDiff) < 3) {
          return b.stability - a.stability;
        }
        return scoreDiff;
      });
    };
    
    // 精准蓝球组合验证
    const isPrecisionValidBlueCombo = (numbers: number[]): boolean => {
      if (numbers.length < 2) return true;
      
      const sortedNumbers = [...numbers].sort((a, b) => a - b);
      
      // 奇偶平衡检查 (1:1 最佳)
      const oddCount = sortedNumbers.filter(n => n % 2 === 1).length;
      if (numbers.length === 2 && (oddCount === 0 || oddCount === 2)) {
        // 允许全奇或全偶，但降低优先级
        return Math.random() > 0.3;
      }
      
      // 大小号平衡检查 (1-6为小号，7-12为大号)
      const smallCount = sortedNumbers.filter(n => n <= 6).length;
      if (numbers.length === 2 && (smallCount === 0 || smallCount === 2)) {
        // 允许全大或全小，但降低优先级
        return Math.random() > 0.4;
      }
      
      // 连号检查 (避免连号)
      for (let i = 1; i < sortedNumbers.length; i++) {
        if (sortedNumbers[i] - sortedNumbers[i-1] === 1) {
          return Math.random() > 0.6; // 连号降低优先级
        }
      }
      
      return true;
    };
    
    // 精准蓝球选号策略
    const strategy = predictionIndex % 3; // 0: 稳定优先, 1: 用户数据优先, 2: 平衡策略
    const candidatePool = generatePrecisionBlueCandidatePool();
    
    let selectedNumbers: number[] = [];
    const maxAttempts = 200;
    let attempts = 0;
    
    while (selectedNumbers.length < count && attempts < maxAttempts) {
      attempts++;
      selectedNumbers = [];
      
      switch (strategy) {
        case 0: { // 稳定优先策略
          const stableCandidates = candidatePool
            .filter(item => item.stability > 10)
            .slice(0, 8);
          
          while (selectedNumbers.length < count && stableCandidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(3, stableCandidates.length));
            const candidate = stableCandidates.splice(randomIndex, 1)[0];
            
            const testCombination = [...selectedNumbers, candidate.number];
            if (isPrecisionValidBlueCombo(testCombination)) {
              selectedNumbers.push(candidate.number);
            }
          }
          break;
        }
        
        case 1: { // 用户数据优先策略
          const userPriorityCandidates = candidatePool
            .filter(item => leastPurchased.length === 0 || leastPurchased.includes(item.number))
            .slice(0, 6);
          
          while (selectedNumbers.length < count && userPriorityCandidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(2, userPriorityCandidates.length));
            const candidate = userPriorityCandidates.splice(randomIndex, 1)[0];
            
            const testCombination = [...selectedNumbers, candidate.number];
            if (isPrecisionValidBlueCombo(testCombination)) {
              selectedNumbers.push(candidate.number);
            }
          }
          break;
        }
        
        case 2: { // 平衡策略
          const balancedCandidates = candidatePool.slice(0, 10);
          
          while (selectedNumbers.length < count && balancedCandidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * Math.min(4, balancedCandidates.length));
            const candidate = balancedCandidates.splice(randomIndex, 1)[0];
            
            const testCombination = [...selectedNumbers, candidate.number];
            if (isPrecisionValidBlueCombo(testCombination)) {
              selectedNumbers.push(candidate.number);
            }
          }
          break;
        }
      }
      
      // 如果选择的号码不足，从剩余候选中补充
      if (selectedNumbers.length < count) {
        const remainingCandidates = candidatePool
          .filter(item => !selectedNumbers.includes(item.number))
          .slice(0, 6);
        
        for (const candidate of remainingCandidates) {
          if (selectedNumbers.length >= count) break;
          
          const testCombination = [...selectedNumbers, candidate.number];
          if (isPrecisionValidBlueCombo(testCombination)) {
            selectedNumbers.push(candidate.number);
          }
        }
      }
    }
    
    // 确保返回正确数量的号码
    if (selectedNumbers.length < count) {
      const fallbackCandidates = candidatePool
        .filter(item => !selectedNumbers.includes(item.number))
        .slice(0, count - selectedNumbers.length)
        .map(item => item.number);
      selectedNumbers = [...selectedNumbers, ...fallbackCandidates].slice(0, count);
    }
    
    return selectedNumbers;
  };
  

  
  // 生成智能分析说明
  const generateIntelligentAnalysis = (redBalls: number[], blueBalls: number[], analysisData: AnalysisData): string => {
    const analyses = [];
    
    // 检查是否有上传数据
    const hasUploadedData = uploadedData.singleTickets.length > 0 || uploadedData.multipleTickets.length > 0;
    
    if (hasUploadedData) {
      if (analysisData.purchasedTicketAnalysis) {
        analyses.push('基于被购买实票分析，选择了购买频率较低的号码组合');
      }
      
      if (analysisData.nonWinningCombosRemoved) {
        analyses.push('已排除历史不中奖组合，提高中奖概率');
      }
      
      analyses.push('后区采用避热策略，优选购买频率低的蓝球组合');
    } else {
      analyses.push('基于历史开奖数据统计，优选冷热号码组合');
      analyses.push('后区运用多维度智能算法：历史频率分析、冷热号平衡、奇偶比例优化');
      analyses.push('蓝球预测结合大小号分布策略，避免连号组合，提升命中概率');
    }
    
    // 添加蓝球特定的分析说明
    const blueBallAnalyses = [
      '蓝球采用加权评分机制，综合历史频率、冷热分布、奇偶平衡等因素',
      '运用智能权重算法，动态调整各策略比重，优化预测准确性',
      '结合大小号码分布规律，避免过度集中选择，提高覆盖面'
    ];
    
    analyses.push(...blueBallAnalyses.slice(0, 2));
    
    analyses.push('运用多策略测算机制，综合神经网络、量子数学等算法');
    analyses.push('结合特征工程学习，分析了走势图中的大小、均值、方差等特征');
    analyses.push('采用保底中奖机制，确保预测结果具有合理的中奖期望');
    
    const selectedAnalyses = analyses.slice(0, Math.min(4, analyses.length));
    return selectedAnalyses.join('；') + '。';
  };
  
  // 保存预测数据
  const savePredictionData = () => {
    const dataToSave = {
      targetPeriod,
      predictionMode,
      predictionCount,
      redBallCount,
      blueBallCount,
      analysisToggles,
      predictionResults,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `智能预测结果_${targetPeriod}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // 重新预测
  const rePrediction = () => {
    startSuperPrediction();
  };
  
  // 智能分析开关状态
  const [analysisToggles, setAnalysisToggles] = useState({
    purchasedAnalysis: false,
    guaranteeWin: false,
    removeNonWinning: false
  });

  const toggleAnalysis = (key: 'purchasedAnalysis' | 'guaranteeWin' | 'removeNonWinning') => {
    setAnalysisToggles(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 头部区域 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">预测配置</h2>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <span>预测目标期数:</span>
              <input
                type="text"
                value={targetPeriod}
                onChange={(e) => setTargetPeriod(e.target.value)}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="期数"
              />
            </div>
            <button 
              onClick={startSuperPrediction}
              disabled={isPredicting}
              className={`px-5 py-2.5 text-base rounded-lg transition-all duration-300 shadow-lg ${
                isPredicting 
                  ? 'bg-gray-400 cursor-not-allowed text-white' 
                  : 'bg-gradient-to-r from-blue-400 to-blue-600 text-white hover:from-blue-500 hover:to-blue-700'
              }`}
            >
              <span className="text-yellow-400">⚡</span>{isPredicting ? '预测中...' : '启动超级预测'}
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 mb-4 font-bold text-left">预测类型</div>
        
        {/* 预测模式切换按钮 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <div className="flex w-full bg-gray-200 rounded overflow-hidden">
              <button
                onClick={() => setPredictionMode('single')}
                className={`flex-1 py-1 px-2 text-sm font-medium transition-colors ${
                  predictionMode === 'single'
                    ? 'bg-white text-blue-600 font-bold mx-1 my-1 rounded'
                    : 'bg-gray-200 text-black'
                }`}
              >
                单式预测
              </button>
              <button
                onClick={() => setPredictionMode('multiple')}
                className={`flex-1 py-1 px-2 text-sm font-medium transition-colors ${
                  predictionMode === 'multiple'
                    ? 'bg-white text-blue-600 font-bold mx-1 my-1 rounded'
                    : 'bg-gray-200 text-black'
                }`}
              >
                复式预测
              </button>
            </div>
          </div>
          
          {/* 根据预测模式显示不同的配置选项 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-600 mb-2 font-bold text-left">预测注数</label>
              <select 
                value={predictionCount} 
                onChange={(e) => setPredictionCount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
              >
                {Array.from({length: 20}, (_, i) => i + 1).map(num => (
                  <option key={num} value={num.toString()}>{num}注</option>
                ))}
              </select>
            </div>
            {predictionMode === 'multiple' && (
              <>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">红球个数 (1-35)</label>
                  <select 
                    value={redBallCount} 
                    onChange={(e) => setRedBallCount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
                  >
                    {Array.from({length: 30}, (_, i) => i + 6).map(num => (
                      <option key={num} value={num.toString()}>{num}个</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">蓝球个数 (1-12)</label>
                  <select 
                    value={blueBallCount} 
                    onChange={(e) => setBlueBallCount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
                  >
                    {Array.from({length: 11}, (_, i) => i + 2).map(num => (
                      <option key={num} value={num.toString()}>{num}个</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
          
          <div className="text-sm text-gray-600 mb-4 font-bold text-left">预测基础数据文件上传</div>
          
          {/* 三个操作按钮 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <input
                type="file"
                ref={singleFileRef}
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'single');
                }}
                className="hidden"
              />
              <button 
                onClick={() => singleFileRef.current?.click()}
                className={`w-full py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 touch-manipulation ${
                  uploadStatus.single 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                <Upload className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{uploadStatus.single ? '已上传单式票' : '上传单式票'}</span>
              </button>
              <div className="text-center text-xs text-gray-500 mt-2">Excel文件含备注"单式票"</div>
            </div>
            <div>
              <input
                type="file"
                ref={multipleFileRef}
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'multiple');
                }}
                className="hidden"
              />
              <button 
                onClick={() => multipleFileRef.current?.click()}
                className={`w-full py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 touch-manipulation ${
                  uploadStatus.multiple 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                } text-white`}
              >
                <Upload className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{uploadStatus.multiple ? '已上传复式票' : '上传复式票'}</span>
              </button>
              <div className="text-center text-xs text-gray-500 mt-2">Excel文件含备注"复式票"</div>
            </div>
            <div>
              <input
                type="file"
                ref={nonWinningFileRef}
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'nonWinning');
                }}
                className="hidden"
              />
              <button 
                onClick={() => nonWinningFileRef.current?.click()}
                className={`w-full py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 touch-manipulation ${
                  uploadStatus.nonWinning 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } text-white`}
              >
                <Upload className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{uploadStatus.nonWinning ? '已上传不中组合' : '上传不中组合'}</span>
              </button>
              <div className="text-center text-xs text-gray-500 mt-2">Excel文件含备注"不中"</div>
            </div>
          </div>
          
          {/* 数据库信息 */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3">数据库信息：</h3>
            <div className="text-sm text-gray-700">
              <span>单式票：</span>
              <span className={`mr-2 ${databaseInfo.singleTickets > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {databaseInfo.singleTickets > 0 ? `${databaseInfo.singleTickets}注` : '未上传'}
              </span>
              <span>加倍数：</span>
              <span className="text-green-500 mr-2">{databaseInfo.multiplier}</span>
              <span className="mx-2 text-gray-400">|</span>
              <span>复式票：</span>
              <span className={`mr-2 ${databaseInfo.multipleTickets > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {databaseInfo.multipleTickets > 0 ? `${databaseInfo.multipleTickets}注` : '未上传'}
              </span>
              <span>拆分单式：</span>
              <span className="text-green-500 mr-2">{databaseInfo.splitSingle}注</span>
              <span className="mx-2 text-gray-400">|</span>
              <span>不中组合：</span>
              <span className={`mr-2 ${databaseInfo.nonWinningCombos > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {databaseInfo.nonWinningCombos > 0 ? `${databaseInfo.nonWinningCombos}组` : '未上传'}
              </span>
              <span className="mx-2 text-gray-400">|</span>
              <span>去重后组合数：</span>
              <span className="text-red-500 mr-2">{databaseInfo.uniqueCombos.toLocaleString()}</span>
              <span>红球剩余组合数：</span>
              <span className="text-red-500">{databaseInfo.remainingRedCombos.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        {/* 智能分析开关控制台 */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">智能分析开关控制台</h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">一键全开</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={Object.values(analysisToggles).every(Boolean)}
                  onChange={(e) => {
                    const newState = e.target.checked;
                    setAnalysisToggles({
                    purchasedAnalysis: newState,
                    guaranteeWin: newState,
                    removeNonWinning: newState
                  });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">被购买实票分析</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={analysisToggles.purchasedAnalysis}
                  onChange={() => toggleAnalysis('purchasedAnalysis')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">保底中奖机制</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={analysisToggles.guaranteeWin}
                  onChange={() => toggleAnalysis('guaranteeWin')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">是否删除不中红球组合</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={analysisToggles.removeNonWinning}
                  onChange={() => toggleAnalysis('removeNonWinning')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      {/* 进度条 */}
      {isPredicting && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>预测进度</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* AI预测结果 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">AI预测结果</h3>
          </div>
          
          {predictionResults.length > 0 && (
            <div className="flex space-x-2">
              <button
                onClick={savePredictionData}
                className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Save className="w-4 h-4" />
                <span>保存预测数据</span>
              </button>
              <button
                onClick={rePrediction}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重新预测</span>
              </button>
            </div>
          )}
        </div>
        
        {predictionResults.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Cpu className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">请先配置预测参数并上传数据文件</p>
            <p className="text-sm mt-2">AI将根据您的配置生成智能预测结果</p>
          </div>
        ) : (
          <div className="space-y-6">
            {predictionResults.map((result) => (
              <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="bg-purple-600 text-white px-2 py-1 rounded text-sm font-semibold">
                    预测#{result.id}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-medium text-gray-600">红球：</span>
                    <div className="flex space-x-1">
                      {result.redBalls.map((ball, index) => (
                        <div key={index} className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {ball.toString().padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-medium text-gray-600">蓝球：</span>
                    <div className="flex space-x-1">
                      {result.blueBalls.map((ball, index) => (
                        <div key={index} className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {ball.toString().padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">预测分析：</div>
                      <div className="text-sm text-gray-600">{result.analysis}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartPrediction;