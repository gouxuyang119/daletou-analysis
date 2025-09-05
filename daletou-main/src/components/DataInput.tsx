import React, { useState, useRef, useEffect } from 'react';
import { Upload, Database, Check, X, AlertCircle, Download, FileText } from 'lucide-react';
import { LotteryData } from '../utils/dataGenerator';
import * as XLSX from 'xlsx';
import { read, utils } from 'xlsx';

interface DataInputProps {
  onDataUpdate: (data: LotteryData[]) => void;
  onError?: (error: string) => void;
}

const DataInput: React.FC<DataInputProps> = ({ onDataUpdate, onError }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingLargeFile, setIsProcessingLargeFile] = useState(false);
  const [newDrawInput, setNewDrawInput] = useState({
    frontNumbers: ['', '', '', '', ''],
    backNumbers: ['', '']
  });
  const [currentIssue, setCurrentIssue] = useState<string>('');
  const [currentData, setCurrentData] = useState<LotteryData[]>([]);

  // 从localStorage加载数据
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('lotteryData');
      if (savedData) {
        const parsedData = JSON.parse(savedData) as LotteryData[];
        setCurrentData(parsedData);
      }
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
    }
  }, []);

  // 生成模拟数据的函数已移除

  // 解析Excel文件（新的格式支持）
  const parseExcelFile = (file: File): Promise<{data: LotteryData[], stats: {processedRows: number, skippedRows: number, errorRows: number}}> => {
    return new Promise((resolve, reject) => {
      setIsProcessingLargeFile(true);
      const reader = new FileReader();
      console.log("开始解析Excel文件:", file.name, "大小:", file.size, "bytes");
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          console.log('Excel文件已读取，开始解析...');
          const workbook = read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName]; 
          
          // 开奖数据处理
          console.log("处理常规开奖数据");
          const rawData = utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
          console.log(`Excel原始数据行数: ${rawData.length}`);
          
          // 检查数据是否为空
          if (!rawData || rawData.length === 0) {
            throw new Error('Excel文件为空或格式不正确');
          }
          
          if (rawData.length < 2) {
            throw new Error('Excel文件数据不足');
          }
          
          // 如果数据量超过5000行，提示用户
          const maxRows = 5000;
          if (rawData.length - 1 > maxRows) {
            console.warn(`Excel文件包含超过${maxRows}行数据，将只处理前${maxRows}行`);
            setMessage({ type: 'info', text: `文件包含${rawData.length - 1}行数据，将只处理前${maxRows}行` });
          }
          
          const parsedData: LotteryData[] = [];
          
          // 从第二行开始处理数据（跳过表头）
          let processedRows = 0;
          let skippedRows = 0;
          let errorRows = 0;
          
          const endRow = Math.min(rawData.length, maxRows + 1); // +1 因为i从1开始
          for (let i = 1; i < endRow; i++) { 
            const row = rawData[i];
            if (!row || row.length < 8) {
              console.log(`跳过第${i+1}行: 列数不足`);
              skippedRows++;
              continue; // 至少需要8列（期号+5个红球+2个蓝球）
            }
            
            try {
              // A列：期号
              const issue = row[0]?.toString().trim();
              if (!issue || !/^\d{5}$/.test(issue)) {
                console.warn(`第${i+1}行期号格式不正确: ${issue}`);
                skippedRows++;
                continue;
              }
              
              // B-F列：红球
              const frontNumbers: number[] = [];
              for (let j = 1; j <= 5; j++) {
                const num = parseInt(row[j]?.toString() || '');
                if (isNaN(num) || num < 1 || num > 35) {
                  throw new Error(`第${i+1}行红球号码不正确: ${row[j]}`);
                }
                frontNumbers.push(num);
              }
              
              // G-H列：蓝球
              const backNumbers: number[] = [];
              for (let j = 6; j <= 7; j++) {
                const num = parseInt(row[j]?.toString() || '');
                if (isNaN(num) || num < 1 || num > 12) {
                  throw new Error(`第${i+1}行蓝球号码不正确: ${row[j]}`);
                }
                backNumbers.push(num);
              }
              
              // 检查重复
              if (new Set(frontNumbers).size !== 5) {
                throw new Error(`第${i+1}行红球号码有重复`);
              }
              
              if (new Set(backNumbers).size !== 2) {
                throw new Error(`第${i+1}行蓝球号码有重复`);
              }
              
              // 创建开奖数据
              parsedData.push({
                period: parsedData.length + 1,
                issue,
                date: new Date(), // 使用当前日期，实际应用中可能需要从其他列获取
                frontNumbers: frontNumbers.sort((a, b) => a - b),
                backNumbers: backNumbers.sort((a, b) => a - b)
              });
              
              processedRows++;
              
            } catch (error) {
              console.error(`第${i+1}行数据错误:`, error);
              errorRows++;
            }
          }
          
          if (parsedData.length === 0) {
            throw new Error('没有找到有效的开奖数据');
          }
          
          // 按期号排序，最新的在前面
          parsedData.sort((a, b) => b.issue.localeCompare(a.issue));
          
          // 重新编号
          parsedData.forEach((item, index) => {
            item.period = index + 1;
          });
          
          const stats = { processedRows, skippedRows, errorRows };
          console.log(`Excel解析完成: 处理${processedRows}行，跳过${skippedRows}行，错误${errorRows}行`);
          resolve({ data: parsedData, stats });
          
        } catch (error) {
          console.error('Excel解析错误:', error);
          reject(error);
        } finally {
          setIsProcessingLargeFile(false);
        }
      };
      
      reader.onerror = () => {
        setIsProcessingLargeFile(false);
        reject(new Error('文件读取失败'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      const errorMsg = '请上传Excel文件（.xlsx或.xls格式）';
      setMessage({ type: 'error', text: errorMsg });
      if (onError) onError(errorMsg);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsProcessingLargeFile(false);
      return;
    }
    
    setIsProcessing(true);
    setMessage(null);
    
    try {
        const result = await parseExcelFile(file);
        const { data, stats } = result;
        
        console.log(`成功解析Excel数据: ${data.length}期`);
        const successMsg = `成功导入 ${data.length} 期开奖数据，可以使用所有功能了。原始文件: ${file.name} (${file.size} bytes)，处理: ${stats.processedRows}行，跳过: ${stats.skippedRows}行，错误: ${stats.errorRows}行`;
        
        // 确保数据保存到localStorage
        try {
          localStorage.setItem('lotteryData', JSON.stringify(data));
          localStorage.setItem('dataLoaded', 'true');
          localStorage.setItem('lastUpdate', new Date().toISOString());
        } catch (storageError) {
          console.error('Failed to save data to localStorage:', storageError);
        }
        
        // 设置当前期号为最新期号+1
        if (data.length > 0) {
          const latestIssue = data[0].issue;
          const year = latestIssue.substring(0, 2);
          const period = parseInt(latestIssue.substring(2));
          const nextPeriod = period + 1;
          setCurrentIssue(`${year}${nextPeriod.toString().padStart(3, '0')}`);
        }
        
        onDataUpdate(data);
        setCurrentData(data);
        setMessage({ type: 'success', text: successMsg });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '文件解析失败';
        console.error('Excel解析错误详情:', error);
        setMessage({ type: 'error', text: errorMsg });
        if (onError) onError(errorMsg);
      } finally {
      setIsProcessing(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 下载模板
  const downloadTemplate = () => {
    const templateData = [
      ['期号', '', '', '', '', '', '', ''],
      ['24001', 1, 5, 12, 23, 35, 2, 11],
      ['24002', 3, 8, 15, 28, 33, 1, 9]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 8 },  // A列：期号
      { wch: 6 },  // B列：红球1
      { wch: 6 },  // C列：红球2
      { wch: 6 },  // D列：红球3
      { wch: 6 },  // E列：红球4
      { wch: 6 },  // F列：红球5
      { wch: 6 },  // G列：蓝球1
      { wch: 6 }   // H列：蓝球2
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '开奖数据');
    XLSX.writeFile(wb, '大乐透开奖数据模板.xlsx');
  };

  // 生成示例数据
  const generateExampleData = () => {
    try {
      // 生成2000期示例数据
      const exampleData: LotteryData[] = [];
      const startDate = new Date('2020-01-01');
      
      for (let i = 0; i < 2000; i++) {
        // 生成期号
        const year = startDate.getFullYear() + Math.floor(i / 104); // 每年约104期
        const periodInYear = (i % 104) + 1;
        const yearSuffix = year.toString().slice(-2); // 取年份后两位
        const issue = `${yearSuffix}${periodInYear.toString().padStart(3, '0')}`;
        
        // 生成开奖日期
        const date = new Date(startDate);
        date.setDate(date.getDate() + i * 3);
        
        // 生成前区号码（5个，1-35）
        const frontNumbers: number[] = [];
        while (frontNumbers.length < 5) {
          const num = Math.floor(Math.random() * 35) + 1;
          if (!frontNumbers.includes(num)) {
            frontNumbers.push(num);
          }
        }
        
        // 生成后区号码（2个，1-12）
        const backNumbers: number[] = [];
        while (backNumbers.length < 2) {
          const num = Math.floor(Math.random() * 12) + 1;
          if (!backNumbers.includes(num)) {
            backNumbers.push(num);
          }
        }
        
        exampleData.push({
          period: exampleData.length + 1,
          issue,
          date,
          frontNumbers: frontNumbers.sort((a, b) => a - b),
          backNumbers: backNumbers.sort((a, b) => a - b)
        });
      }
      
      // 按期号排序，最新的在前面
      exampleData.sort((a, b) => b.issue.localeCompare(a.issue));
      
      // 重新编号
      exampleData.forEach((item, index) => {
        item.period = index + 1;
      });
      
      // 更新数据
      onDataUpdate(exampleData);
      setCurrentData(exampleData);
      
      // 保存当前数据并设置当前期号为最新期号+1
      // 数据已生成
      if (exampleData.length > 0) {
        const latestIssue = exampleData[0].issue;
        const year = latestIssue.substring(0, 2);
        const period = parseInt(latestIssue.substring(2));
        const nextPeriod = period + 1;
        setCurrentIssue(`${year}${nextPeriod.toString().padStart(3, '0')}`);
      }
      
      // 确保数据保存到localStorage
      try {
        localStorage.setItem('lotteryData', JSON.stringify(exampleData));
        localStorage.setItem('dataLoaded', 'true');
        localStorage.setItem('lastUpdate', new Date().toISOString());
      } catch (storageError) {
        console.error('Failed to save data to localStorage:', storageError);
      }
      
      setMessage({ type: 'success', text: `成功生成 ${exampleData.length} 期示例数据，可以使用所有功能了` });
      
    } catch (error) {
      const errorMsg = '生成示例数据失败: ' + (error instanceof Error ? error.message : '未知错误');
      setMessage({ type: 'error', text: errorMsg });
      if (onError) onError(errorMsg);
    }
  };

  // 处理新开奖号码输入变化
  const handleNumberInputChange = (area: 'front' | 'back', index: number, value: string) => {
    const numValue = value.replace(/\D/g, '');
    const validValue = numValue.slice(0, 2); // 最多两位数
    
    if (area === 'front') {
      const newFrontNumbers = [...newDrawInput.frontNumbers];
      newFrontNumbers[index] = validValue;
      setNewDrawInput({
        ...newDrawInput,
        frontNumbers: newFrontNumbers
      });
    } else {
      const newBackNumbers = [...newDrawInput.backNumbers];
      newBackNumbers[index] = validValue;
      setNewDrawInput({
        ...newDrawInput,
        backNumbers: newBackNumbers
      });
    }
  };

  // 验证输入的号码
  const validateDrawInput = () => {
    // 检查前区号码
    const frontNumbers = newDrawInput.frontNumbers
      .map(num => parseInt(num))
      .filter(num => !isNaN(num) && num >= 1 && num <= 35);
    
    // 检查后区号码
    const backNumbers = newDrawInput.backNumbers
      .map(num => parseInt(num))
      .filter(num => !isNaN(num) && num >= 1 && num <= 12);
    
    // 检查是否有重复
    const uniqueFront = new Set(frontNumbers);
    const uniqueBack = new Set(backNumbers);
    
    if (frontNumbers.length !== 5 || uniqueFront.size !== 5) {
      return { valid: false, message: '前区需要5个不重复的号码（1-35）' };
    }
    
    if (backNumbers.length !== 2 || uniqueBack.size !== 2) {
      return { valid: false, message: '后区需要2个不重复的号码（1-12）' };
    }
    
    return { 
      valid: true, 
      frontNumbers: Array.from(uniqueFront).sort((a, b) => a - b),
      backNumbers: Array.from(uniqueBack).sort((a, b) => a - b)
    };
  };

  // 添加新的开奖结果
  const handleAddNewDraw = () => {
    if (!currentIssue || !/^\d{5}$/.test(currentIssue)) {
      setMessage({ type: 'error', text: '请输入有效的期号（5位数字）' });
      return;
    }
    
    const validation = validateDrawInput();
    if (!validation.valid) {
      setMessage({ type: 'error', text: validation.message });
      return;
    }
    
    // 保存当前期号用于消息显示
    const addedIssue = currentIssue;
    
    // 创建新的开奖数据
    const newDraw: LotteryData = {
      period: 0, // 临时值，后面会更新
      issue: currentIssue,
      date: new Date(), // 当前日期
      frontNumbers: validation.frontNumbers,
      backNumbers: validation.backNumbers
    };
    
    // 合并数据并重新排序
    const updatedData = [newDraw, ...currentData];
    
    // 重新编号
    updatedData.forEach((item, index) => {
      item.period = index + 1;
    });
    
    // 更新状态和localStorage
    // 数据已更新
    onDataUpdate(updatedData);
    
    try {
      localStorage.setItem('lotteryData', JSON.stringify(updatedData));
      localStorage.setItem('lastUpdate', new Date().toISOString());
    } catch (storageError) {
      console.error('Failed to save updated data to localStorage:', storageError);
    }
    
    // 计算并设置下一期期号
    const year = currentIssue.substring(0, 2);
    const period = parseInt(currentIssue.substring(2));
    const nextPeriod = period + 1;
    setCurrentIssue(`${year}${nextPeriod.toString().padStart(3, '0')}`);
    
    // 清空输入
    setNewDrawInput({
      frontNumbers: ['', '', '', '', ''],
      backNumbers: ['', '']
    });
    
    setMessage({ type: 'success', text: `成功添加${addedIssue}期开奖数据` });
  };

  // 从localStorage加载数据
  useEffect(() => {
    try {
      const savedDataLoaded = localStorage.getItem('dataLoaded') === 'true';
      if (savedDataLoaded) {
        const savedData = localStorage.getItem('lotteryData');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          // 转换字符串日期回Date对象
          const processedData = parsedData.map((item: unknown) => ({
            ...item,
            date: new Date(item.date)
          }));
          
          // 数据已处理
          
          // 设置当前期号为最新期号+1
          if (processedData.length > 0) {
            const latestIssue = processedData[0].issue;
            const year = latestIssue.substring(0, 2);
            const period = parseInt(latestIssue.substring(2));
            const nextPeriod = period + 1;
            setCurrentIssue(`${year}${nextPeriod.toString().padStart(3, '0')}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
          <Database className="w-5 h-5 mr-2 text-blue-600" />
          数据录入
        </h2>
        
        {/* 消息提示 */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-700' :
            message.type === 'error' ? 'bg-red-100 text-red-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {message.type === 'success' && <Check className="w-4 h-4" />}
            {message.type === 'error' && <X className="w-4 h-4" />}
            {message.type === 'info' && <AlertCircle className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Excel文件上传 */}
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            {isProcessingLargeFile ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
            ) : (
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            )}
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                {isProcessingLargeFile ? '正在处理大文件...' : '上传Excel文件'}
              </p>
              <p className="text-sm text-gray-500">
                支持 .xlsx 格式，最大支持5000期数据<br/>
                开奖数据格式：A列期号，B-F列红球，G-H列蓝球
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || isProcessingLargeFile}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 touch-manipulation min-h-[44px] text-base"
              >
                {isProcessing ? '处理中...' : '选择文件'}
              </button>
            </div>
          </div>
          
          <div className="flex justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
              <button
                onClick={downloadTemplate}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 touch-manipulation min-h-[44px] text-base"
              >
                  <Download className="w-5 h-5" />
                  <span>下载Excel模板</span>
                </button>
              <button
                  onClick={generateExampleData}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 touch-manipulation min-h-[44px] text-base"
                >
                  <FileText className="w-5 h-5" />
                  <span>生成示例数据</span>
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* 录入当期开奖号码 */}
      {currentData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
            <Database className="w-5 h-5 mr-2 text-green-600" />
            录入当期开奖号码
          </h3>
          
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-blue-700 font-medium">当前最新期号: {currentData[0]?.issue || '暂无数据'}</div>
              <div className="text-blue-700 font-medium">总数据期数: {currentData.length}</div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-blue-700 font-medium">期号输入框当前值: {currentIssue || '空'}</div>
            </div>
            <p className="text-sm text-blue-600">
              您可以在下方录入最新一期的开奖号码，系统将自动更新分析数据
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                期号
              </label>
              <input
                type="text"
                value={currentIssue}
                onChange={(e) => setCurrentIssue(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="请输入5位期号"
                className="w-full p-3 border border-gray-300 rounded-lg touch-manipulation text-base min-h-[44px]"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                前区号码（5个红球，1-35）
              </label>
              <div className="flex space-x-2">
                {newDrawInput.frontNumbers.map((num, index) => (
                  <input
                    key={`front-${index}`}
                    type="text"
                    value={num}
                    onChange={(e) => handleNumberInputChange('front', index, e.target.value)}
                    placeholder={(index + 1).toString()}
                    className="w-14 h-14 text-center border border-red-300 rounded-lg text-red-600 font-bold touch-manipulation text-base min-h-[44px]"
                    maxLength={2}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                后区号码（2个蓝球，1-12）
              </label>
              <div className="flex space-x-2">
                {newDrawInput.backNumbers.map((num, index) => (
                  <input
                    key={`back-${index}`}
                    type="text"
                    value={num}
                    onChange={(e) => handleNumberInputChange('back', index, e.target.value)}
                    placeholder={(index + 1).toString()}
                    className="w-14 h-14 text-center border border-blue-300 rounded-lg text-blue-600 font-bold touch-manipulation text-base min-h-[44px]"
                    maxLength={2}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleAddNewDraw}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 touch-manipulation min-h-[44px] text-base"
            >
              添加开奖结果
            </button>
          </div>
        </div>
      )}

      {/* Excel文件格式说明 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-md font-semibold text-gray-900 mb-4">Excel文件格式说明</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">文件结构要求</h4>
            <div className="bg-gray-50 p-4 rounded text-sm">
              <div className="grid grid-cols-8 gap-2 mb-2 font-bold">
                <div className="text-center border p-1">A</div>
                <div className="text-center border p-1">B</div>
                <div className="text-center border p-1">C</div>
                <div className="text-center border p-1">D</div>
                <div className="text-center border p-1">E</div>
                <div className="text-center border p-1">F</div>
                <div className="text-center border p-1">G</div>
                <div className="text-center border p-1">H</div>
              </div>
              <h5 className="font-medium mt-4 mb-2">开奖数据格式:</h5>
              <div className="grid grid-cols-8 gap-2 mb-2">
                <div className="text-center border p-1">期号</div>
                <div className="text-center border p-1 bg-red-100">红球1</div>
                <div className="text-center border p-1 bg-red-100">红球2</div>
                <div className="text-center border p-1 bg-red-100">红球3</div>
                <div className="text-center border p-1 bg-red-100">红球4</div>
                <div className="text-center border p-1 bg-red-100">红球5</div>
                <div className="text-center border p-1 bg-blue-100">蓝球1</div>
                <div className="text-center border p-1 bg-blue-100">蓝球2</div>
              </div>
              <div className="grid grid-cols-8 gap-2">
                <div className="text-center border p-1">24001</div>
                <div className="text-center border p-1">1</div>
                <div className="text-center border p-1">5</div>
                <div className="text-center border p-1">12</div>
                <div className="text-center border p-1">23</div>
                <div className="text-center border p-1">35</div>
                <div className="text-center border p-1">2</div>
                <div className="text-center border p-1">11</div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">数据要求</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                <li>• <strong>A列期号</strong>: 5位数字格式（如24001）</li>
                <li>• <strong>B-F列红球</strong>: 数字1-35，不能重复</li>
                <li>• <strong>G-H列蓝球</strong>: 数字1-12，不能重复</li>
                <li>• <strong>数据行数</strong>: 最大支持5000行</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">注意事项</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                <li>• 第一行可以是表头，会自动跳过</li>
                <li>• 期号格式：年份后两位+期数（如24001）</li>
                <li>• 号码必须是纯数字，不要包含前导零</li>
                <li>• 数据按期号从小到大排列</li>
                <li>• 确保文件为.xlsx格式</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-2">快速开始提示</h4>
            <p className="text-sm text-blue-700 mb-3">
              如果您没有现成的Excel数据，可以使用以下方法快速开始：
            </p>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal pl-5">
              <li>点击"下载Excel模板"获取标准格式模板</li>
              <li>按模板格式填入您的数据并保存</li>
              <li>上传填好的Excel文件</li>
              <li>或者直接点击"生成示例数据"按钮，系统会自动生成2000期模拟数据供您测试使用</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataInput;