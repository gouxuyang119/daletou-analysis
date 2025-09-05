import React, { useState } from 'react';
import { Calendar, Search, Download, Eye } from 'lucide-react';
import { LotteryData } from '../utils/dataGenerator';
import { format } from 'date-fns';

interface HistoryTableProps {
  data: LotteryData[];
  dataLoaded: boolean;
  onError?: (error: string) => void;
}

const HistoryTable: React.FC<HistoryTableProps> = ({ data, dataLoaded, onError }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'period' | 'date'>('period');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 过滤和排序数据
  const filteredData = dataLoaded ? data
    .filter(item => 
      searchTerm === '' || 
      item.issue.includes(searchTerm) ||
      item.period.toString().includes(searchTerm)
    )
    .sort((a, b) => {
      const aValue = sortField === 'period' ? a.period : a.date.getTime();
      const bValue = sortField === 'period' ? b.period : b.date.getTime();
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    })
  : [];

  // 分页数据
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // 导出数据
  const handleExport = () => {
    if (!dataLoaded || data.length === 0) {
      if (onError) onError("没有数据可导出，请先导入数据");
      return;
    }
    
    const csvContent = [
      ['期号', '开奖日期', '前区号码', '后区号码'].join(','),
      ...filteredData.map(item => [
        item.issue,
        format(item.date, 'yyyy-MM-dd'),
        item.frontNumbers.map(n => n.toString().padStart(2, '0')).join(' '),
        item.backNumbers.map(n => n.toString().padStart(2, '0')).join(' ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lottery_history_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // 分析单期数据
  const analyzeDrawing = (item: LotteryData) => {
    const frontSum = item.frontNumbers.reduce((sum, num) => sum + num, 0);
    const backSum = item.backNumbers.reduce((sum, num) => sum + num, 0);
    const frontOddCount = item.frontNumbers.filter(num => num % 2 === 1).length;
    const frontEvenCount = 5 - frontOddCount;
    const backOddCount = item.backNumbers.filter(num => num % 2 === 1).length;
    const backEvenCount = 2 - backOddCount;

    return {
      frontSum,
      backSum,
      frontOddEven: `${frontOddCount}:${frontEvenCount}`,
      backOddEven: `${backOddCount}:${backEvenCount}`,
      frontSpan: Math.max(...item.frontNumbers) - Math.min(...item.frontNumbers),
      backSpan: Math.max(...item.backNumbers) - Math.min(...item.backNumbers)
    };
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            历史数据
          </h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索期号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortField(field as 'period' | 'date');
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="period-desc">期号降序</option>
              <option value="period-asc">期号升序</option>
              <option value="date-desc">日期降序</option>
              <option value="date-asc">日期升序</option>
            </select>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value={10}>10条/页</option>
              <option value={20}>20条/页</option>
              <option value={50}>50条/页</option>
              <option value={100}>100条/页</option>
            </select>
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>导出</span>
            </button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-sm text-blue-600">总期数</div>
            <div className="text-xl font-bold text-blue-700">{data.length}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-sm text-green-600">筛选结果</div>
            <div className="text-xl font-bold text-green-700">{filteredData.length}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-sm text-purple-600">当前页</div>
            <div className="text-xl font-bold text-purple-700">{currentPage}/{totalPages}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-sm text-orange-600">显示条数</div>
            <div className="text-xl font-bold text-orange-700">{paginatedData.length}</div>
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  期号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  开奖日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  前区号码
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  后区号码
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  分析
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((item) => {
                const analysis = analyzeDrawing(item);
                return (
                  <tr key={item.period} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.issue}</div>
                      <div className="text-sm text-gray-500">第{item.period}期</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(item.date, 'yyyy-MM-dd')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        {item.frontNumbers.map(num => (
                          <div
                            key={num}
                            className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold"
                          >
                            {num.toString().padStart(2, '0')}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        {item.backNumbers.map(num => (
                          <div
                            key={num}
                            className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold"
                          >
                            {num.toString().padStart(2, '0')}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        <div>和值: {analysis.frontSum} + {analysis.backSum}</div>
                        <div>奇偶: {analysis.frontOddEven} + {analysis.backOddEven}</div>
                        <div>跨度: {analysis.frontSpan} + {analysis.backSpan}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>详情</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                显示第 <span className="font-medium">{startIndex + 1}</span> 到{' '}
                <span className="font-medium">{Math.min(startIndex + pageSize, filteredData.length)}</span> 条，
                共 <span className="font-medium">{filteredData.length}</span> 条记录
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  上一页
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  下一页
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryTable;