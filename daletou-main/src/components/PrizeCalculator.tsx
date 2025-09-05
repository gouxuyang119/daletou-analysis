import React, { useState } from 'react';
import { Calculator, DollarSign, Trophy, Target } from 'lucide-react';

const PrizeCalculator: React.FC = () => {
  const [selectedRed, setSelectedRed] = useState(5);
  const [selectedBlue, setSelectedBlue] = useState(2);
  const [hitRed, setHitRed] = useState(0);
  const [hitBlue, setHitBlue] = useState(0);
  const [result, setResult] = useState<{
    prize: number;
    cost: number;
    profit: number;
    level: string;
    notes: number;
  } | null>(null);

  // 奖金等级定义
  const prizeTable = [
    { level: '一等奖', red: 5, blue: 2, prize: 5000000 },
    { level: '二等奖', red: 5, blue: 1, prize: 250000 },
    { level: '三等奖', red: 5, blue: 0, prize: 10000 },
    { level: '四等奖', red: 4, blue: 2, prize: 3000 },
    { level: '五等奖', red: 4, blue: 1, prize: 300 },
    { level: '六等奖', red: 3, blue: 2, prize: 200 },
    { level: '七等奖', red: 4, blue: 0, prize: 100 },
    { level: '八等奖', red: 3, blue: 1, prize: 15 },
    { level: '八等奖', red: 2, blue: 2, prize: 15 },
    { level: '九等奖', red: 3, blue: 0, prize: 5 },
    { level: '九等奖', red: 2, blue: 1, prize: 5 },
    { level: '九等奖', red: 1, blue: 2, prize: 5 },
    { level: '九等奖', red: 0, blue: 2, prize: 5 }
  ];

  // 计算组合数
  const combination = (n: number, r: number): number => {
    if (r > n || r < 0) return 0;
    if (r === 0 || r === n) return 1;
    
    let result = 1;
    for (let i = 0; i < r; i++) {
      result = result * (n - i) / (i + 1);
    }
    return Math.round(result);
  };

  // 计算投注成本
  const calculateCost = (redCount: number, blueCount: number): number => {
    const redCombinations = combination(redCount, 5);
    const blueCombinations = combination(blueCount, 2);
    return redCombinations * blueCombinations * 2; // 每注2元
  };

  // 计算中奖注数和奖金
  const calculatePrize = () => {
    if (hitRed > selectedRed || hitBlue > selectedBlue) {
      alert('命中数不能大于选择数！');
      setResult(null);
      return;
    }

    const cost = calculateCost(selectedRed, selectedBlue);
    let totalPrize = 0;
    let winningLevel = '';
    let totalNotes = 0;

    // 遍历所有奖级，计算中奖情况
    for (const prize of prizeTable) {
      if (hitRed >= prize.red && hitBlue >= prize.blue) {
        // 计算这个奖级的中奖注数
        // 修正组合数计算
        let redWinCombinations = 0;
        let blueWinCombinations = 0;
        
        if (hitRed >= prize.red && selectedRed - hitRed >= 5 - prize.red) {
          redWinCombinations = combination(hitRed, prize.red) * combination(selectedRed - hitRed, 5 - prize.red);
        }
        
        if (hitBlue >= prize.blue && selectedBlue - hitBlue >= 2 - prize.blue) {
          blueWinCombinations = combination(hitBlue, prize.blue) * combination(selectedBlue - hitBlue, 2 - prize.blue);
        }
        
        const notes = redWinCombinations * blueWinCombinations;
        
        if (notes > 0) {
          totalPrize += notes * prize.prize;
          totalNotes += notes;
          if (!winningLevel) {
            winningLevel = prize.level;
          }
        }
      }
    }

    const profit = totalPrize - cost;

    setResult({
      prize: totalPrize,
      cost,
      profit,
      level: winningLevel || '未中奖',
      notes: totalNotes
    });
  };

  // 格式化金额
  const formatMoney = (amount: number): string => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万`;
    }
    return amount.toString();
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
          <Calculator className="w-5 h-5 mr-2 text-green-600" />
          奖金计算器
        </h2>

        {/* 选号投注设置 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">选号投注</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  红球选择数量
                </label>
                <select
                  value={selectedRed}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setSelectedRed(value);
                    // 确保命中数不大于选择数
                    if (hitRed > value) {
                      setHitRed(value);
                    }
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-3 touch-manipulation text-base min-h-[44px]"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 5).map(num => (
                    <option key={num} value={num}>{num}个</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  蓝球选择数量
                </label>
                <select
                  value={selectedBlue}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setSelectedBlue(value);
                    // 确保命中数不大于选择数
                    if (hitBlue > value) {
                      setHitBlue(value);
                    }
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-3 touch-manipulation text-base min-h-[44px]"
                >
                  {Array.from({ length: 34 }, (_, i) => i + 2).map(num => (
                    <option key={num} value={num}>{num}个</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-md font-medium text-gray-900">开奖命中</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  红球命中数量
                </label>
                <select
                  value={hitRed}
                  onChange={(e) => setHitRed(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-3 touch-manipulation text-base min-h-[44px]"
                >
                  {Array.from({ length: Math.min(6, selectedRed + 1) }, (_, i) => i).map(num => (
                    <option key={num} value={num}>{num}个</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  蓝球命中数量
                </label>
                <select
                  value={hitBlue}
                  onChange={(e) => setHitBlue(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded px-3 py-3 touch-manipulation text-base min-h-[44px]"
                >
                  {Array.from({ length: Math.min(3, selectedBlue + 1) }, (_, i) => i).map(num => (
                    <option key={num} value={num}>{num}个</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 计算按钮 */}
        <div className="flex justify-center mb-6">
          <button
            onClick={calculatePrize}
            className="flex items-center space-x-2 px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors touch-manipulation min-h-[44px] text-base"
          >
            <Calculator className="w-5 h-5" />
            <span>计算奖金</span>
          </button>
        </div>

        {/* 计算结果 */}
        {result && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
              计算结果
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatMoney(result.prize)}
                </div>
                <div className="text-sm text-gray-600">中奖金额</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {formatMoney(result.cost)}
                </div>
                <div className="text-sm text-gray-600">投注花费</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${result.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {result.profit >= 0 ? '+' : ''}{formatMoney(result.profit)}
                </div>
                <div className="text-sm text-gray-600">盈亏金额</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {result.notes}
                </div>
                <div className="text-sm text-gray-600">中奖注数</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <Target className="w-4 h-4 mr-1" />
                {result.level}
              </span>
            </div>
            <div className="mt-4 text-center text-sm text-gray-600">
              {selectedRed > 5 || selectedBlue > 2 ? '复式投注' : '单式投注'} · 
              中{result.prize > 0 ? formatMoney(result.prize) : '0'}元 · 
              花费{formatMoney(result.cost)}元 · 
              {result.profit >= 0 ? '赚' : '亏'}{formatMoney(Math.abs(result.profit))}元 · 
              命中{result.level}{result.notes}注
            </div>
          </div>
        )}
      </div>

      {/* 奖金等级表 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
          奖金等级表
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  奖级
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  中奖条件
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  奖金
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  说明
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {prizeTable.map((prize, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {prize.level}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                        红球{prize.red}个
                      </span>
                      <span className="text-gray-400">+</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        蓝球{prize.blue}个
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-bold text-green-600">
                      {formatMoney(prize.prize)}元
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {prize.level === '一等奖' && '浮动奖金，最高500万'}
                    {prize.level === '二等奖' && '浮动奖金，一般25万左右'}
                    {prize.level.includes('等奖') && !prize.level.includes('一等') && !prize.level.includes('二等') && '固定奖金'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-yellow-800 mb-2">使用说明</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 选择红球和蓝球的投注数量（复式投注可选择更多号码）</li>
          <li>• 输入实际开奖时命中的红球和蓝球数量</li>
          <li>• 系统会自动计算所有可能的中奖组合和奖金</li>
          <li>• 复式投注成本较高，但中奖概率和奖金也相应增加</li>
          <li>• 一等奖和二等奖为浮动奖金，实际金额可能有所不同</li>
        </ul>
      </div>
    </div>
  );
};

export default PrizeCalculator;