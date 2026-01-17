#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI API测试脚本
用于测试与百度千帆大模型API的连接
"""

import argparse
import json
import requests
from datetime import datetime

def test_ai_api(api_url, api_key, model_name, prompt, provider="baidu"):
    """
    测试AI API连接
    
    Args:
        api_url: API地址
        api_key: API密钥
        model_name: 模型名称
        prompt: 测试提示词
        provider: AI提供商，默认为baidu
    """
    print("=" * 60)
    print(f"AI API测试开始 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print(f"API地址: {api_url}")
    print(f"API密钥: {api_key[:10]}...{api_key[-5:]}")
    print(f"模型名称: {model_name}")
    print(f"测试提示词: {prompt[:50]}...")
    print(f"AI提供商: {provider}")
    print("=" * 60)
    
    try:
        # 根据提供商构建请求
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        if provider == "baidu":
            # 百度千帆API格式
            payload = {
                "model": model_name,
                "messages": [
                    {
                        "role": "system",
                        "content": "你是一个专业的动漫信息助手，帮助用户填写动漫相关信息"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.7,
                "max_tokens": 2000
            }
        elif provider == "openai":
            # OpenAI API格式
            payload = {
                "model": model_name,
                "messages": [
                    {
                        "role": "system",
                        "content": "你是一个专业的动漫信息助手，帮助用户填写动漫相关信息"
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.7,
                "max_tokens": 2000
            }
        else:
            print(f"不支持的AI提供商: {provider}")
            return False
        
        print("\n发送请求...")
        print(f"请求头: {json.dumps(dict(headers), indent=2)}")
        print(f"请求体: {json.dumps(payload, indent=2, ensure_ascii=False)}")
        
        # 发送请求
        response = requests.post(
            api_url,
            headers=headers,
            json=payload,
            timeout=30
        )
        
        print("\n" + "=" * 60)
        print(f"响应状态码: {response.status_code}")
        print(f"响应状态: {response.reason}")
        print(f"响应时间: {response.elapsed.total_seconds():.2f}秒")
        print("=" * 60)
        
        # 打印响应头
        print("\n响应头:")
        for key, value in response.headers.items():
            print(f"  {key}: {value}")
        
        # 打印响应内容
        print("\n响应内容:")
        try:
            response_json = response.json()
            print(json.dumps(response_json, indent=2, ensure_ascii=False))
        except json.JSONDecodeError:
            print("响应内容不是有效的JSON格式:")
            print(response.text)
        
        # 检查请求是否成功
        if response.status_code == 200:
            print("\n✅ API测试成功!")
            return True
        else:
            print(f"\n❌ API测试失败，状态码: {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print("\n❌ 请求超时，服务器没有在规定时间内响应")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"\n❌ 连接错误，无法连接到API服务器: {e}")
        print("请检查API地址是否正确，网络连接是否正常")
        return False
    except requests.exceptions.RequestException as e:
        print(f"\n❌ 请求异常: {e}")
        return False
    except Exception as e:
        print(f"\n❌ 发生未知错误: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        print("\n" + "=" * 60)
        print(f"AI API测试结束 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="AI API测试脚本")
    
    # 百度千帆默认配置
    parser.add_argument("--api-url", default="https://qianfan.baidubce.com/v2/chat/completions",
                        help="API地址，默认为百度千帆地址")
    parser.add_argument("--api-key", required=True,
                        help="API密钥")
    parser.add_argument("--model", default="qwen3-14b",
                        help="模型名称，默认为qwen3-14b")
    parser.add_argument("--prompt", default="请介绍一下动漫《无职转生》",
                        help="测试提示词")
    parser.add_argument("--provider", default="baidu", choices=["baidu", "openai"],
                        help="AI提供商，默认为baidu")
    
    args = parser.parse_args()
    
    test_ai_api(
        args.api_url,
        args.api_key,
        args.model,
        args.prompt,
        args.provider
    )


if __name__ == "__main__":
    main()
