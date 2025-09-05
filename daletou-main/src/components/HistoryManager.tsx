import React, { useState, useEffect, useCallback } from 'react';
import { Save, Download, Upload, Trash2, Calendar, Database, CheckCircle } from 'lucide-react';
import { LotteryData } from '../utils/dataGenerator';

interface HistoryManagerProps {
  data: LotteryData[];
  dataLoaded: boolean;
  onError: (message: string) => void;
}

interface SavedDataSet {
  id: string;
  name: string;
  data: LotteryData[];
  savedAt: Date;
  recordCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}

const HistoryManager: React.FC<HistoryManagerProps> = ({ data, dataLoaded, onError }) => {
  const [savedDataSets, setSavedDataSets] = useState<SavedDataSet[]>([]);
  const [saveName, setSaveName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 从localStorage加载已保存的数据集
  const loadSavedDataSets = useCallback(() => {
    try {
      const saved = localStorage.getItem('savedDataSets');
      if (saved) {
        const parsedSets = JSON.parse(saved).map((set: SavedDataSet & { savedAt: string; data: Array<LotteryData & { date: string }> }) => ({
          ...set,
          savedAt: new Date(set.savedAt),
          data: set.data.map((item: LotteryData & { date: string }) => ({
            ...item,
            date: new Date(item.date)
          }))
        }));
        setSavedDataSets(parsedSets);
      }
    } catch (error) {
      console.error('加载历史数据失败:', error);
      onError('加载历史数据失败');
    }
  }, [onError]);

  // 加载已保存的数据集
  useEffect(() => {
    loadSavedDataSets();
  }, [loadSavedDataSets]);

  // 保存当前数据集
  const handleSaveCurrentData = () => {
    if (!dataLoaded || data.length === 0) {
      onError('没有可保存的数据，请先导入数据');
      return;
    }

    if (!saveName.trim()) {
      onError('请输入保存名称');
      return;
    }

    // 检查名称是否已存在
    if (savedDataSets.some(set => set.name === saveName.trim())) {
      onError('该名称已存在，请使用其他名称');
      return;
    }

    setIsLoading(true);

    try {
      const newDataSet: SavedDataSet = {
        id: Date.now().toString(),
        name: saveName.trim(),
        data: data,
        savedAt: new Date(),
        recordCount: data.length,
        dateRange: {
          start: data[0]?.issue || '',
          end: data[data.length - 1]?.issue || ''
        }
      };

      const updatedSets = [...savedDataSets, newDataSet];
      setSavedDataSets(updatedSets);
      localStorage.setItem('savedDataSets', JSON.stringify(updatedSets));
      
      setSaveName('');
      setSuccessMessage(`数据集"${newDataSet.name}"保存成功`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('保存数据失败:', error);
      onError('保存数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 加载指定的数据集
  const handleLoadDataSet = (dataSet: SavedDataSet) => {
    try {
      // 将数据加载到主应用中
      localStorage.setItem('lotteryData', JSON.stringify(dataSet.data));
      localStorage.setItem('dataLoaded', 'true');
      localStorage.setItem('lastUpdate', new Date().toISOString());
      
      setSuccessMessage(`数据集"${dataSet.name}"加载成功，请刷新页面查看`);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('加载数据失败:', error);
      onError('加载数据失败');
    }
  };

  // 删除数据集
  const handleDeleteDataSet = (id: string, name: string) => {
    if (!confirm(`确定要删除数据集"${name}"吗？此操作不可撤销。`)) {
      return;
    }

    try {
      const updatedSets = savedDataSets.filter(set => set.id !== id);
      setSavedDataSets(updatedSets);
      localStorage.setItem('savedDataSets', JSON.stringify(updatedSets));
      
      setSuccessMessage(`数据集"${name}"删除成功`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('删除数据失败:', error);
      onError('删除数据失败');
    }
  };

  // 导出数据集
  const handleExportDataSet = (dataSet: SavedDataSet) => {
    try {
      const exportData = {
        name: dataSet.name,
        data: dataSet.data,
        savedAt: dataSet.savedAt,
        recordCount: dataSet.recordCount,
        dateRange: dataSet.dateRange
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dataSet.name}_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      setSuccessMessage(`数据集"${dataSet.name}"导出成功`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('导出数据失败:', error);
      onError('导出数据失败');
    }
  };

  // 导入数据集
  const handleImportDataSet = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        // 验证数据格式
        if (!importedData.name || !importedData.data || !Array.isArray(importedData.data)) {
          onError('导入文件格式不正确');
          return;
        }

        // 检查名称是否已存在
        let finalName = importedData.name;
        let counter = 1;
        while (savedDataSets.some(set => set.name === finalName)) {
          finalName = `${importedData.name}_${counter}`;
          counter++;
        }

        const newDataSet: SavedDataSet = {
          id: Date.now().toString(),
          name: finalName,
          data: importedData.data.map((item: LotteryData & { date: string }) => ({
            ...item,
            date: new Date(item.date)
          })),
          savedAt: new Date(),
          recordCount: importedData.data.length,
          dateRange: importedData.dateRange || {
            start: importedData.data[0]?.issue || '',
            end: importedData.data[importedData.data.length - 1]?.issue || ''
          }
        };

        const updatedSets = [...savedDataSets, newDataSet];
        setSavedDataSets(updatedSets);
        localStorage.setItem('savedDataSets', JSON.stringify(updatedSets));
        
        setSuccessMessage(`数据集"${finalName}"导入成功`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (error) {
        console.error('导入数据失败:', error);
        onError('导入数据失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    
    // 清空input值，允许重复选择同一文件
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* 成功提示 */}
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded flex items-start">
          <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">操作成功</p>
            <p className="text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      {/* 保存当前数据 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Save className="w-5 h-5 mr-2" />
          保存当前数据
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Database className="w-4 h-4" />
            <span>当前数据: {dataLoaded ? `${data.length} 条记录` : '未加载数据'}</span>
          </div>
          
          <div className="flex space-x-4">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="输入保存名称..."
              className="flex-1 px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation text-base min-h-[44px]"
              disabled={!dataLoaded || isLoading}
            />
            <button
              onClick={handleSaveCurrentData}
              disabled={!dataLoaded || isLoading || !saveName.trim()}
              className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 touch-manipulation text-base min-h-[44px]"
            >
              <Save className="w-5 h-5" />
              <span>{isLoading ? '保存中...' : '保存'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 导入数据集 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Upload className="w-5 h-5 mr-2" />
          导入数据集
        </h2>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            选择之前导出的数据集文件进行导入
          </p>
          
          <input
            type="file"
            accept=".json"
            onChange={handleImportDataSet}
            className="block w-full text-base text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-md file:border-0 file:text-base file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:touch-manipulation file:min-h-[44px]"
          />
        </div>
      </div>

      {/* 已保存的数据集 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2" />
          已保存的数据集 ({savedDataSets.length})
        </h2>
        
        {savedDataSets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无保存的数据集</p>
            <p className="text-sm">保存当前数据或导入数据集文件开始使用</p>
          </div>
        ) : (
          <div className="space-y-4">
            {savedDataSets.map((dataSet) => (
              <div key={dataSet.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{dataSet.name}</h3>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <Database className="w-4 h-4 mr-1" />
                          {dataSet.recordCount} 条记录
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {dataSet.savedAt.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        期号范围: {dataSet.dateRange.start} - {dataSet.dateRange.end}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleLoadDataSet(dataSet)}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center space-x-1 touch-manipulation min-h-[36px]"
                      title="加载此数据集"
                    >
                      <Upload className="w-4 h-4" />
                      <span>加载</span>
                    </button>
                    
                    <button
                      onClick={() => handleExportDataSet(dataSet)}
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center space-x-1 touch-manipulation min-h-[36px]"
                      title="导出此数据集"
                    >
                      <Download className="w-4 h-4" />
                      <span>导出</span>
                    </button>
                    
                    <button
                      onClick={() => handleDeleteDataSet(dataSet.id, dataSet.name)}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center space-x-1 touch-manipulation min-h-[36px]"
                      title="删除此数据集"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>删除</span>
                    </button>
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

export default HistoryManager;