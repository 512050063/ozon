---
name: ozon-crawler-api-design
description: Ozon跨境电商助手API设计文档
---

# Ozon跨境电商助手 - API设计文档

---

## 📋 API设计原则

### 基本设计原则
1. **RESTful风格**：资源导向的API设计
2. **版本控制**：使用 `/v1` 前缀
3. **统一响应格式**：所有接口返回相同的JSON格式
4. **错误处理**：统一的错误码和错误信息
5. **文档化**：每个接口详细说明输入输出
6. **安全性**：JWT认证，输入验证

### 响应格式规范

**成功响应**：
```json
{
  "success": true,
  "data": {
    "key": "value"
  },
  "message": "操作成功",
  "timestamp": 1704067200000
}
```

**错误响应**：
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "AUTH_001",
    "message": "用户未认证",
    "details": "JWT token无效或过期"
  },
  "timestamp": 1704067200000
}
```

---

## 🔐 认证与授权

### 登录接口 (POST /api/v1/auth/login)

**描述**：用户登录，获取访问令牌

**请求参数**：
```json
{
  "username": "ozon_seller",
  "password": "password123"
}
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "60d5ec4904a9a32f4472694d",
      "username": "ozon_seller",
      "email": "seller@example.com",
      "role": "seller",
      "full_name": "张三"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "登录成功"
}
```

**错误响应**：
- `AUTH_001`：用户名或密码错误
- `AUTH_002`：账号已被锁定
- `AUTH_003`：登录尝试次数过多

---

### 获取当前用户信息 (GET /api/v1/auth/me)

**描述**：获取当前登录用户的信息

**请求头**：
```
Authorization: Bearer {token}
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "60d5ec4904a9a32f4472694d",
      "username": "ozon_seller",
      "email": "seller@example.com",
      "role": "seller",
      "full_name": "张三",
      "store_name": "我的Ozon店铺"
    }
  }
}
```

---

## 📋 用户管理 (需要ADMIN角色)

### 创建用户 (POST /api/v1/users)

**描述**：创建新用户（仅管理员）

**请求参数**：
```json
{
  "username": "new_seller",
  "email": "new@example.com",
  "password": "password123",
  "full_name": "李四",
  "role": "seller"
}
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "id": "60d5ec4904a9a32f4472694e",
    "username": "new_seller"
  },
  "message": "用户创建成功"
}
```

---

### 获取用户列表 (GET /api/v1/users)

**描述**：获取用户列表（分页）

**查询参数**：
```
page=1&limit=10&role=seller&status=active
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "60d5ec4904a9a32f4472694d",
        "username": "ozon_seller",
        "email": "seller@example.com",
        "role": "seller",
        "full_name": "张三",
        "status": "active"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

## 🔧 API配置管理

### 获取API配置列表 (GET /api/v1/api-configs)

**描述**：获取用户的API配置列表

**请求头**：
```
Authorization: Bearer {token}
```

**成功响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": "60d5ec4904a9a32f4472694e",
      "platform": "ozon",
      "config": {
        "client_id": "21345",
        "api_key": "******************",
        "status": "valid",
        "calls_today": 125
      }
    },
    {
      "id": "60d5ec4904a9a32f4472694f",
      "platform": "1688",
      "config": {
        "app_key": "123456",
        "status": "valid",
        "calls_today": 89
      }
    }
  ]
}
```

---

### 创建API配置 (POST /api/v1/api-configs)

**描述**：创建或更新API配置

**请求头**：
```
Authorization: Bearer {token}
```

**请求参数**：
```json
{
  "platform": "ozon",
  "config": {
    "client_id": "21345",
    "api_key": "abc123xyz"
  }
}
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "id": "60d5ec4904a9a32f4472694e",
    "platform": "ozon",
    "config": {
      "client_id": "21345",
      "api_key": "******************",
      "status": "valid"
    }
  },
  "message": "API配置保存成功"
}
```

---

### 测试API连接 (POST /api/v1/api-configs/:id/test)

**描述**：测试API配置的连接性

**请求头**：
```
Authorization: Bearer {token}
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "connected": true,
    "api_status": "ok",
    "response_time": 1200
  },
  "message": "API连接测试成功"
}
```

**错误响应**：
```json
{
  "success": false,
  "data": {
    "connected": false,
    "error": "Invalid API key"
  },
  "message": "API连接测试失败"
}
```

---

## 📦 商品管理

### Ozon选品分析 (GET /api/v1/products/ozon-analyze)

**描述**：在Ozon平台进行选品分析

**请求头**：
```
Authorization: Bearer {token}
```

**查询参数**：
```
category_id=123&price_min=0&price_max=5000&min_rating=4.0&limit=20
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "60d5ec4904a9a32f4472694f",
        "title": {
          "original": "Оригинальный товар",
          "translated": "原装商品"
        },
        "price": 1499,
        "rating": 4.8,
        "reviews_count": 1200,
        "sales_count": 5000,
        "source_url": "https://www.ozon.ru/product/123"
      }
    ],
    "category_info": {
      "id": "123",
      "name": "Электроника",
      "translated": "电子产品"
    }
  },
  "message": "选品分析完成"
}
```

---

### 1688货源对接 (GET /api/v1/products/1688-source)

**描述**：在1688平台查找货源

**请求头**：
```
Authorization: Bearer {token}
```

**查询参数**：
```
keyword=手机壳&min_order=10&price_min=0&price_max=100&limit=20
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "60d5ec4904a9a32f44726950",
        "title": "手机壳保护套",
        "price": 20,
        "supplier_name": "深圳市XX电子",
        "supplier_id": "7890",
        "min_order": 10,
        "rating": 4.6,
        "transaction_count": 1234,
        "source_url": "https://1688.com/product/12345"
      }
    ]
  },
  "message": "货源查找完成"
}
```

---

### 添加商品到本地仓库 (POST /api/v1/products/warehouse)

**描述**：将商品添加到本地仓库

**请求头**：
```
Authorization: Bearer {token}
```

**请求参数**：
```json
{
  "product_id": "60d5ec4904a9a32f4472694f",
  "stock": 50,
  "tags": ["热门", "新品"]
}
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "id": "60d5ec4904a9a32f44726951",
    "status": "pending"
  },
  "message": "商品添加到仓库成功"
}
```

---

## 📦 本地仓库管理

### 获取本地仓库商品列表 (GET /api/v1/warehouse)

**描述**：获取本地仓库商品列表（支持筛选和分页）

**请求头**：
```
Authorization: Bearer {token}
```

**查询参数**：
```
status=pending&tags=热门&page=1&limit=20
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "60d5ec4904a9a32f44726951",
        "product_id": "60d5ec4904a9a32f4472694f",
        "title": "原装商品",
        "price": {
          "source_price": 99,
          "listing_price": 1499
        },
        "stock": {
          "local": 50,
          "ozon": 0,
          "1688": 1000
        },
        "status": "pending",
        "tags": ["热门", "新品"]
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

### 更新仓库商品 (PUT /api/v1/warehouse/:id)

**描述**：更新仓库商品信息

**请求头**：
```
Authorization: Bearer {token}
```

**请求参数**：
```json
{
  "stock": 45,
  "price": {
    "listing_price": 1399
  },
  "tags": ["热门"]
}
```

**成功响应**：
```json
{
  "success": true,
  "message": "仓库商品更新成功"
}
```

---

### 删除仓库商品 (DELETE /api/v1/warehouse/:id)

**描述**：删除仓库商品

**请求头**：
```
Authorization: Bearer {token}
```

**成功响应**：
```json
{
  "success": true,
  "message": "仓库商品删除成功"
}
```

---

## 🚀 一键上架功能

### 执行一键上架 (POST /api/v1/listing/batch)

**描述**：执行一键上架操作（支持批量）

**请求头**：
```
Authorization: Bearer {token}
```

**请求参数**：
```json
{
  "warehouse_item_ids": ["60d5ec4904a9a32f44726951"],
  "price_strategy": "auto",
  "stock_strategy": "sync"
}
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "total": 1,
    "success_count": 1,
    "failed_count": 0,
    "failed_items": []
  },
  "message": "一键上架完成"
}
```

**错误响应（部分成功）**：
```json
{
  "success": false,
  "data": {
    "total": 2,
    "success_count": 1,
    "failed_count": 1,
    "failed_items": [
      {
        "id": "60d5ec4904a9a32f44726952",
        "error": "Category not available"
      }
    ]
  },
  "message": "一键上架完成，但有1个商品失败"
}
```

---

### 获取上架任务状态 (GET /api/v1/listing/status/:task_id)

**描述**：获取一键上架任务的状态

**请求头**：
```
Authorization: Bearer {token}
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "task_id": "task123",
    "status": "completed",
    "progress": 100,
    "start_time": 1704067200000,
    "end_time": 1704067205000,
    "results": {
      "total": 1,
      "success_count": 1,
      "failed_count": 0
    }
  }
}
```

---

## 📊 首页统计

### 获取首页统计数据 (GET /api/v1/dashboard)

**描述**：获取首页的统计数据和图表数据

**请求头**：
```
Authorization: Bearer {token}
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_products": 120,
      "active_listings": 85,
      "pending_listings": 35,
      "low_stock_products": 8,
      "api_calls_today": 456
    },
    "trends": {
      "product_count_30d": [
        { "date": "2024-01-01", "count": 100 },
        { "date": "2024-01-10", "count": 110 },
        { "date": "2024-01-20", "count": 120 }
      ],
      "listing_success_rate": [
        { "date": "2024-01-01", "rate": 0.95 },
        { "date": "2024-01-10", "rate": 0.98 },
        { "date": "2024-01-20", "rate": 0.92 }
      ]
    },
    "quick_actions": [
      { "label": "快速选品", "url": "/select-product" },
      { "label": "待上架商品", "url": "/warehouse" }
    ]
  }
}
```

---

## 🔄 翻译功能

### 文本翻译 (POST /api/v1/translation/translate)

**描述**：翻译文本

**请求头**：
```
Authorization: Bearer {token}
```

**请求参数**：
```json
{
  "text": "Оригинальный текст",
  "source_lang": "ru",
  "target_lang": "zh-CN"
}
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "original_text": "Оригинальный текст",
    "translated_text": "原文",
    "confidence": 0.95,
    "service": "baidu"
  }
}
```

---

### 批量翻译 (POST /api/v1/translation/batch)

**描述**：批量翻译文本（可用于商品属性翻译）

**请求头**：
```
Authorization: Bearer {token}
```

**请求参数**：
```json
{
  "texts": ["品牌", "型号", "颜色"],
  "source_lang": "zh-CN",
  "target_lang": "ru"
}
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "translations": [
      { "original": "品牌", "translated": "Бренд" },
      { "original": "型号", "translated": "Модель" },
      { "original": "颜色", "translated": "Цвет" }
    ]
  }
}
```

---

## 📈 系统统计

### 获取系统使用统计 (GET /api/v1/stats/system)

**描述**：获取系统使用统计（仅管理员）

**请求头**：
```
Authorization: Bearer {token}
```

**成功响应**：
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 100,
      "active_today": 15,
      "new_this_week": 5
    },
    "api_usage": {
      "total_calls": 10000,
      "ozon_calls": 6000,
      "1688_calls": 3000,
      "translation_calls": 1000
    },
    "listings": {
      "total_listings": 1500,
      "active_listings": 1200,
      "daily_listings": 85
    }
  }
}
```

---

## 🛡️ 错误码定义

### 认证错误 (AUTH_XXX)
- `AUTH_001`：用户未认证（JWT无效）
- `AUTH_002`：无权限访问
- `AUTH_003`：账号已锁定
- `AUTH_004`：登录失败次数过多

### 用户管理错误 (USER_XXX)
- `USER_001`：用户不存在
- `USER_002`：用户名已存在
- `USER_003`：邮箱已存在
- `USER_004`：密码强度不够

### API配置错误 (API_XXX)
- `API_001`：API配置不存在
- `API_002`：API配置无效
- `API_003`：API调用失败
- `API_004`：API调用频率超限

### 商品管理错误 (PRODUCT_XXX)
- `PRODUCT_001`：商品不存在
- `PRODUCT_002`：商品信息不完整
- `PRODUCT_003`：商品已在仓库中

### 上架错误 (LISTING_XXX)
- `LISTING_001`：仓库商品不存在
- `LISTING_002`：商品信息不完整
- `LISTING_003`：API调用失败
- `LISTING_004`：价格策略无效

### 翻译错误 (TRANS_XXX)
- `TRANS_001`：翻译API配置无效
- `TRANS_002`：翻译API调用失败
- `TRANS_003`：语言不支持

---

## 🔧 API调用示例（使用JavaScript）

### 使用Fetch调用登录接口
```javascript
const login = async (username, password) => {
  try {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
  }
};

// 使用示例
login('ozon_seller', 'password123')
  .then(result => {
    if (result.success) {
      console.log('Login successful');
    } else {
      console.error('Login failed:', result.error);
    }
  });
```

### 使用Axios调用API配置接口
```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL
});

// 请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 获取API配置列表
const getApiConfigs = async () => {
  try {
    const response = await api.get('/api-configs');
    return response.data;
  } catch (error) {
    console.error('Error getting API configs:', error);
    return { success: false };
  }
};

// 使用示例
getApiConfigs().then(result => {
  if (result.success) {
    console.log('API configs:', result.data);
  }
});
```
