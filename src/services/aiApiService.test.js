// AI API服务单元测试
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildAIRequest, parseAIResponse, validateAIConfig, getDefaultModelConfig } from './aiApiService';

// Mock console.log和console.error
const originalLog = console.log;
const originalError = console.error;

beforeEach(() => {
  console.log = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
});

describe('AI API服务测试', () => {
  describe('buildAIRequest', () => {
    it('应该构建正确的OpenAI请求', () => {
      const aiConfig = {
        provider: 'openai',
        apiKey: 'sk-1234567890abcdef',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini'
      };
      const prompt = '测试提示词';
      
      const requestConfig = buildAIRequest(aiConfig, prompt);
      
      expect(requestConfig.url).toBe(aiConfig.endpoint);
      expect(requestConfig.method).toBe('POST');
      expect(requestConfig.headers['Content-Type']).toBe('application/json');
      expect(requestConfig.headers['Authorization']).toBe('Bearer sk-1234567890abcdef');
      
      const requestBody = JSON.parse(requestConfig.body);
      expect(requestBody.model).toBe(aiConfig.model);
      expect(requestBody.messages).toHaveLength(2);
      expect(requestBody.messages[0].role).toBe('system');
      expect(requestBody.messages[1].role).toBe('user');
      expect(requestBody.messages[1].content).toBe(prompt);
    });
    
    it('应该构建正确的百度千帆请求', () => {
      const aiConfig = {
        provider: 'baidu',
        apiKey: 'bdsk-1234567890abcdef',
        endpoint: 'https://qianfan.baidubce.com/v2/chat/completions',
        model: 'qwen3-14b'
      };
      const prompt = '测试提示词';
      
      const requestConfig = buildAIRequest(aiConfig, prompt);
      
      expect(requestConfig.url).toBe(aiConfig.endpoint);
      expect(requestConfig.method).toBe('POST');
      expect(requestConfig.headers['Content-Type']).toBe('application/json');
      expect(requestConfig.headers['Authorization']).toBe('Bearer bdsk-1234567890abcdef');
      
      const requestBody = JSON.parse(requestConfig.body);
      expect(requestBody.messages).toHaveLength(2);
      expect(requestBody.messages[0].role).toBe('system');
      expect(requestBody.messages[1].role).toBe('user');
      expect(requestBody.messages[1].content).toBe(prompt);
      expect(requestBody.model).toBe(aiConfig.model);
      expect(requestBody.temperature).toBe(0.7);
      expect(requestBody.max_tokens).toBe(2000);
    });
    
    it('应该构建正确的Gemini请求', () => {
      const aiConfig = {
        provider: 'gemini',
        apiKey: 'gemini-key-1234567890',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
      };
      const prompt = '测试提示词';
      
      const requestConfig = buildAIRequest(aiConfig, prompt);
      
      expect(requestConfig.url).toBe(aiConfig.endpoint);
      expect(requestConfig.method).toBe('POST');
      expect(requestConfig.headers['Content-Type']).toBe('application/json');
      expect(requestConfig.headers['x-goog-api-key']).toBe('gemini-key-1234567890');
      
      const requestBody = JSON.parse(requestConfig.body);
      expect(requestBody.contents).toHaveLength(1);
      expect(requestBody.contents[0].parts).toHaveLength(1);
      expect(requestBody.contents[0].parts[0].text).toContain(prompt);
    });
  });
  
  describe('parseAIResponse', () => {
    it('应该正确解析OpenAI响应', async () => {
      const mockResponseData = {
        choices: [{
          message: {
            content: JSON.stringify({
              altTitles: ['Test Title'],
              tags: ['Action', 'Adventure'],
              description: 'Test description',
              links: [{ name: 'Test Link', url: 'https://example.com' }]
            })
          }
        }]
      };
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
        json: vi.fn().mockResolvedValue(mockResponseData)
      };
      
      const result = await parseAIResponse(mockResponse, 'openai');
      
      expect(result).toEqual({
        altTitles: ['Test Title'],
        tags: ['Action', 'Adventure'],
        description: 'Test description',
        links: [{ name: 'Test Link', url: 'https://example.com' }]
      });
    });
    
    it('应该正确解析百度千帆响应', async () => {
      const mockResponseData = {
        choices: [{
          message: {
            content: JSON.stringify({
              altTitles: ['Test Title'],
              tags: ['Action', 'Adventure'],
              description: 'Test description',
              links: [{ name: 'Test Link', url: 'https://example.com' }]
            })
          }
        }]
      };
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
        json: vi.fn().mockResolvedValue(mockResponseData)
      };
      
      const result = await parseAIResponse(mockResponse, 'baidu');
      
      expect(result).toEqual({
        altTitles: ['Test Title'],
        tags: ['Action', 'Adventure'],
        description: 'Test description',
        links: [{ name: 'Test Link', url: 'https://example.com' }]
      });
    });
    
    it('应该正确解析Gemini响应', async () => {
      const mockResponseData = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                altTitles: ['Test Title'],
                tags: ['Action', 'Adventure'],
                description: 'Test description',
                links: [{ name: 'Test Link', url: 'https://example.com' }]
              })
            }]
          }
        }]
      };
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
        json: vi.fn().mockResolvedValue(mockResponseData)
      };
      
      const result = await parseAIResponse(mockResponse, 'gemini');
      
      expect(result).toEqual({
        altTitles: ['Test Title'],
        tags: ['Action', 'Adventure'],
        description: 'Test description',
        links: [{ name: 'Test Link', url: 'https://example.com' }]
      });
    });
    
    it('应该处理错误响应', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue('{"error":{"message":"Invalid API key"}}'),
        json: vi.fn().mockRejectedValue(new Error('JSON解析错误'))
      };
      
      await expect(parseAIResponse(mockResponse)).rejects.toThrow('API请求失败');
    });
  });
  
  describe('validateAIConfig', () => {
    it('应该验证有效的配置', () => {
      const aiConfig = {
        apiKey: 'sk-1234567890abcdef',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini'
      };
      
      const result = validateAIConfig(aiConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('应该验证无效的配置', () => {
      const aiConfig = {
        endpoint: 'https://api.openai.com/v1/chat/completions'
      };
      
      const result = validateAIConfig(aiConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
    
    it('Gemini配置不需要模型名称', () => {
      const aiConfig = {
        provider: 'gemini',
        apiKey: 'gemini-key-1234567890',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
      };
      
      const result = validateAIConfig(aiConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
  
  describe('getDefaultModelConfig', () => {
    it('应该返回正确的默认配置', () => {
      const openaiConfig = getDefaultModelConfig('openai');
      expect(openaiConfig.endpoint).toBe('https://api.openai.com/v1/chat/completions');
      expect(openaiConfig.model).toBe('gpt-4o-mini');
      
      const baiduConfig = getDefaultModelConfig('baidu');
      expect(baiduConfig.endpoint).toBe('https://qianfan.baidubce.com/v2/chat/completions');
      expect(baiduConfig.model).toBe('qwen3-14b');
      
      // 测试默认值
      const defaultConfig = getDefaultModelConfig('unknown');
      expect(defaultConfig).toEqual(getDefaultModelConfig('openai'));
    });
  });
});
