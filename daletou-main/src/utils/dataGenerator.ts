export interface LotteryData {
  period: number;
  issue: string;
  date: Date;
  frontNumbers: number[];
  backNumbers: number[];
}

// 生成模拟的大乐透数据
export const generateMockData = (count: number): LotteryData[] => {
  const data: LotteryData[] = [];
  const startDate = new Date('2020-01-01');
  
  for (let i = 0; i < count; i++) {
    // 生成期号（新格式：年份后两位+期数）
    const period = count - i;
    const year = startDate.getFullYear() + Math.floor(i / 104); // 每年约104期
    const periodInYear = (i % 104) + 1;
    const yearSuffix = year.toString().slice(-2); // 取年份后两位
    const issue = `${yearSuffix}${periodInYear.toString().padStart(3, '0')}`;
    
    // 生成开奖日期（每周一、三、六）
    const date = new Date(startDate);
    date.setDate(date.getDate() + i * 3);
    
    // 生成前区号码（5个，1-35）
    const frontNumbers = generateUniqueNumbers(5, 1, 35);
    
    // 生成后区号码（2个，1-12）
    const backNumbers = generateUniqueNumbers(2, 1, 12);
    
    data.push({
      period,
      issue,
      date,
      frontNumbers: frontNumbers.sort((a, b) => a - b),
      backNumbers: backNumbers.sort((a, b) => a - b)
    });
  }
  
  return data.reverse(); // 最新的在前面
};

// 生成不重复的随机数
const generateUniqueNumbers = (count: number, min: number, max: number): number[] => {
  const numbers: number[] = [];
  const available = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    numbers.push(available[randomIndex]);
    available.splice(randomIndex, 1);
  }
  
  return numbers;
};

// 分析历史数据趋势
export const analyzeTrends = (data: LotteryData[]) => {
  // 分析号码出现频率
  const frontFrequency: { [key: number]: number } = {};
  const backFrequency: { [key: number]: number } = {};
  
  // 初始化
  for (let i = 1; i <= 35; i++) frontFrequency[i] = 0;
  for (let i = 1; i <= 12; i++) backFrequency[i] = 0;
  
  // 统计频率
  data.forEach(item => {
    item.frontNumbers.forEach(num => frontFrequency[num]++);
    item.backNumbers.forEach(num => backFrequency[num]++);
  });
  
  return { frontFrequency, backFrequency };
};

// 分析冷热号码
export const analyzeHotCold = (data: LotteryData[], recentPeriods: number = 50) => {
  const recentData = data.slice(0, recentPeriods);
  const trends = analyzeTrends(recentData);
  
  // 计算平均出现次数
  const frontAvg = Object.values(trends.frontFrequency).reduce((sum, count) => sum + count, 0) / 35;
  const backAvg = Object.values(trends.backFrequency).reduce((sum, count) => sum + count, 0) / 12;
  
  // 分类冷热号码
  const frontHot = Object.entries(trends.frontFrequency)
    .filter(([, count]) => count > frontAvg * 1.2)
    .map(([num]) => parseInt(num));
    
  const frontCold = Object.entries(trends.frontFrequency)
    .filter(([, count]) => count < frontAvg * 0.8)
    .map(([num]) => parseInt(num));
    
  const backHot = Object.entries(trends.backFrequency)
    .filter(([, count]) => count > backAvg * 1.2)
    .map(([num]) => parseInt(num));
    
  const backCold = Object.entries(trends.backFrequency)
    .filter(([, count]) => count < backAvg * 0.8)
    .map(([num]) => parseInt(num));
  
  return {
    front: { hot: frontHot, cold: frontCold },
    back: { hot: backHot, cold: backCold }
  };
};