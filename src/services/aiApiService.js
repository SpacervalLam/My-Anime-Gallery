// AI API服务模块

/**
 * 构建AI API请求
 * @param {Object} aiConfig - AI配置
 * @param {string} prompt - 请求提示词
 * @returns {Object} 请求配置对象
 */
export function buildAIRequest(aiConfig, prompt) {
  const provider = aiConfig.provider || 'openai';
  
  // 构建基础请求配置
  const requestConfig = {
    url: aiConfig.endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  // 构建请求体
  let requestBody;
  
  switch (provider) {
    case 'gemini':
      // Google Gemini API格式
      requestConfig.headers['x-goog-api-key'] = aiConfig.apiKey;
      requestBody = {
        contents: [
          {
            parts: [
              {
                text: (aiConfig.systemPrompt || '你是一个专业、严谨的动漫信息助手，必须提供真实、准确、可靠的信息，帮助用户填写动漫相关信息。你必须：1. 只提供经过验证的真实信息；2. 不虚构或猜测任何内容；3. 使用客观、准确的语言；4. 确保所有信息来源可靠；5. 避免产生幻觉或错误信息。') + '\n\n' + prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: aiConfig.temperature || 0.7,
          maxOutputTokens: aiConfig.maxTokens || 2000
        }
      };
      break;
      
    case 'baidu':
      // 百度千帆API格式
      requestConfig.headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
      requestBody = {
        model: aiConfig.model,
        messages: [
          {
            role: 'system',
            content: aiConfig.systemPrompt || '你是一个专业、严谨的动漫信息助手，必须提供真实、准确、可靠的信息，帮助用户填写动漫相关信息。你必须：1. 只提供经过验证的真实信息；2. 不虚构或猜测任何内容；3. 使用客观、准确的语言；4. 确保所有信息来源可靠；5. 避免产生幻觉或错误信息。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: aiConfig.temperature || 0.7,
        max_tokens: aiConfig.maxTokens || 2000
      };
      break;
      
    case 'doubao':
      // 火山引擎豆包API格式
      requestConfig.headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
      // 组合systemPrompt和prompt作为input
      const combinedInput = (aiConfig.systemPrompt || '你是一个专业、严谨的动漫信息助手，必须提供真实、准确、可靠的信息，帮助用户填写动漫相关信息。你必须：1. 只提供经过验证的真实信息；2. 不虚构或猜测任何内容；3. 使用客观、准确的语言；4. 确保所有信息来源可靠；5. 避免产生幻觉或错误信息。') + '\n\n' + prompt;
      requestBody = {
        model: aiConfig.model,
        input: combinedInput
      };
      break;
      
    default:
      // OpenAI/Anthropic标准格式
      requestConfig.headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
      requestBody = {
        model: aiConfig.model,
        messages: [
          {
            role: 'system',
            content: aiConfig.systemPrompt || '你是一个专业、严谨的动漫信息助手，必须提供真实、准确、可靠的信息，帮助用户填写动漫相关信息。你必须：1. 只提供经过验证的真实信息；2. 不虚构或猜测任何内容；3. 使用客观、准确的语言；4. 确保所有信息来源可靠；5. 避免产生幻觉或错误信息。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: aiConfig.temperature || 0.7,
        max_tokens: aiConfig.maxTokens || 2000
      };
      break;
  }
  
  requestConfig.body = JSON.stringify(requestBody);
  
  // 记录构建的请求配置（隐藏敏感信息）
  const logConfig = {
    ...requestConfig,
    headers: { ...requestConfig.headers }
  };
  // 隐藏敏感信息
  for (const key in logConfig.headers) {
    if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token')) {
      logConfig.headers[key] = logConfig.headers[key].substring(0, 10) + '...';
    }
  }
  console.log('构建的AI请求:', logConfig);
  console.log('完整请求体:', requestConfig.body);
  
  return requestConfig;
}

/**
 * 解析AI API响应
 * @param {Object} response - 原始响应对象
 * @param {string} provider - 模型提供商
 * @returns {Object} 解析后的响应数据
 */
export async function parseAIResponse(response, provider = 'openai') {
  console.log('AI响应状态:', response.status, response.statusText);
  
  // 检查响应状态
  if (!response.ok) {
    const responseText = await response.text();
    console.error('AI API错误响应:', responseText);
    throw new Error(`API请求失败: ${response.status} ${response.statusText}\n响应内容: ${responseText}`);
  }
  
  // 解析响应体
  let responseData;
  try {
    // 尝试直接解析JSON
    responseData = await response.json();
    console.log('AI API原始响应:', responseData);
  } catch (jsonError) {
    // 如果JSON解析失败，尝试解析文本
    const responseText = await response.text();
    console.error('AI API JSON解析失败，尝试文本解析:', responseText);
    throw new Error(`响应内容不是有效的JSON格式: ${jsonError.message}`);
  }
  
  // 根据提供商解析响应
  let content = '';
  
  switch (provider) {
    case 'gemini':
      // 解析Google Gemini响应
      if (responseData.candidates && responseData.candidates.length > 0) {
        if (responseData.candidates[0].content && responseData.candidates[0].content.parts) {
          for (const part of responseData.candidates[0].content.parts) {
            if (part.text) {
              content += part.text;
            }
          }
        }
      }
      break;
      
    case 'baidu':
      // 解析百度千帆响应
      if (responseData.choices && responseData.choices.length > 0) {
        if (responseData.choices[0].message && responseData.choices[0].message.content) {
          content = responseData.choices[0].message.content;
        }
      }
      break;
      
    case 'doubao':
      // 解析火山引擎豆包响应
      if (responseData.output && responseData.output.length > 0) {
        // 找到assistant角色的message
        const assistantMessage = responseData.output.find(item => 
          item.type === 'message' && item.role === 'assistant'
        );
        if (assistantMessage && assistantMessage.content && assistantMessage.content.length > 0) {
          // 提取text内容
          const textContent = assistantMessage.content.find(contentItem => 
            contentItem.type === 'output_text'
          );
          if (textContent && textContent.text) {
            content = textContent.text;
          }
        }
      }
      break;
      
    default:
      // 解析OpenAI/Anthropic等响应
      if (responseData.choices && responseData.choices.length > 0) {
        if (responseData.choices[0].message && responseData.choices[0].message.content) {
          content = responseData.choices[0].message.content;
        }
      }
      break;
  }
  
  console.log('提取的AI响应内容:', content);
  
  // 解析JSON内容
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error('JSON解析错误:', error, '响应内容:', content);
    throw new Error(`响应内容不是有效的JSON格式: ${content.substring(0, 100)}...`);
  }
}

/**
 * 发送AI API请求
 * @param {Object} aiConfig - AI配置
 * @param {string} prompt - 请求提示词
 * @param {number} timeout - 请求超时时间（毫秒）
 * @returns {Object} 解析后的AI响应数据
 */
export async function sendAIRequest(aiConfig, prompt, timeout = 30000) {
  try {
    console.log('通过Electron主进程发送AI请求');
    
    // 通过Electron主进程发送请求，避开CORS限制
    const response = await window.electronAPI.sendAIRequest(aiConfig, prompt, timeout);
    
    console.log('AI请求成功，返回结果');
    return response;
  } catch (error) {
    console.error('AI请求错误:', error);
    
    // 处理不同类型的错误
    if (error.message.includes('timeout') || error.message.includes('超时')) {
      throw new Error('API请求超时，请检查网络连接或重试');
    } else if (error.message.includes('network') || error.message.includes('网络')) {
      // 更详细的网络错误信息
      throw new Error(`网络错误: ${error.message || '无法连接到API服务器'}`);
    } else {
      // 保留原始错误信息，帮助调试
      throw new Error(`API请求失败: ${error.message}`);
    }
  }
}

/**
 * 验证AI配置是否有效
 * @param {Object} aiConfig - AI配置
 * @returns {Object} 验证结果
 */
export function validateAIConfig(aiConfig) {
  const errors = [];
  
  if (!aiConfig.apiKey) {
    errors.push('请填写API密钥');
  }
  
  if (!aiConfig.endpoint) {
    errors.push('请填写API端点');
  }
  
  if (!aiConfig.model && aiConfig.provider !== 'gemini') {
    errors.push('请填写模型名称');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 获取默认模型配置
 * @param {string} provider - 模型提供商
 * @returns {Object} 默认模型配置
 */
export function getDefaultModelConfig(provider) {
  const defaultConfigs = {
    openai: {
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini'
    },
    anthropic: {
      endpoint: 'https://api.anthropic.com/v1/messages',
      model: 'claude-3-5-sonnet-20241022'
    },
    gemini: {
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      model: ''
    },
    baidu: {
      endpoint: 'https://qianfan.baidubce.com/v2/chat/completions',
      model: 'qwen3-14b'
    },
    doubao: {
      endpoint: 'https://ark.cn-beijing.volces.com/api/v3/responses',
      model: 'doubao-seed-1-6-250615'
    }
  };
  
  return defaultConfigs[provider] || defaultConfigs.openai;
}
