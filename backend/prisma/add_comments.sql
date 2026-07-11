-- 为数据库所有表添加中文注释
USE ozon_crawler_db;
SET NAMES utf8mb4;

-- 1. roles 角色表
ALTER TABLE roles COMMENT '角色表';
ALTER TABLE roles MODIFY COLUMN id INT COMMENT '角色ID';
ALTER TABLE roles MODIFY COLUMN name VARCHAR(191) COMMENT '角色名称';
ALTER TABLE roles MODIFY COLUMN code VARCHAR(191) COMMENT '角色编码';
ALTER TABLE roles MODIFY COLUMN description VARCHAR(191) COMMENT '角色描述';
ALTER TABLE roles MODIFY COLUMN createdAt DATETIME(3) COMMENT '创建时间';
ALTER TABLE roles MODIFY COLUMN updatedAt DATETIME(3) COMMENT '更新时间';
ALTER TABLE roles MODIFY COLUMN isSystem BOOLEAN COMMENT '是否系统角色';
ALTER TABLE roles MODIFY COLUMN permissions JSON COMMENT '权限列表';

-- 2. users 用户表
ALTER TABLE users COMMENT '用户表';
ALTER TABLE users MODIFY COLUMN id INT COMMENT '用户ID';
ALTER TABLE users MODIFY COLUMN username VARCHAR(191) COMMENT '用户名';
ALTER TABLE users MODIFY COLUMN password VARCHAR(191) COMMENT '密码';
ALTER TABLE users MODIFY COLUMN status VARCHAR(191) COMMENT '用户状态';
ALTER TABLE users MODIFY COLUMN createdAt DATETIME(3) COMMENT '创建时间';
ALTER TABLE users MODIFY COLUMN updatedAt DATETIME(3) COMMENT '更新时间';
ALTER TABLE users MODIFY COLUMN wechatAvatar VARCHAR(191) COMMENT '微信头像';
ALTER TABLE users MODIFY COLUMN wechatNickname VARCHAR(191) COMMENT '微信昵称';
ALTER TABLE users MODIFY COLUMN wechatOpenid VARCHAR(191) COMMENT '微信OpenID';
ALTER TABLE users MODIFY COLUMN wechatUnionid VARCHAR(191) COMMENT '微信UnionID';
ALTER TABLE users MODIFY COLUMN memberLevel VARCHAR(191) COMMENT '会员等级';
ALTER TABLE users MODIFY COLUMN avatar VARCHAR(191) COMMENT '用户头像';
ALTER TABLE users MODIFY COLUMN nickname VARCHAR(191) COMMENT '用户昵称';
ALTER TABLE users MODIFY COLUMN phone VARCHAR(191) COMMENT '手机号码';
ALTER TABLE users MODIFY COLUMN roleId INT COMMENT '角色ID';
ALTER TABLE users MODIFY COLUMN trialExpiration DATETIME(3) COMMENT '试用到期时间';
ALTER TABLE users MODIFY COLUMN hasClaimedTrial BOOLEAN COMMENT '是否已领取试用';
ALTER TABLE users MODIFY COLUMN memberExpiration DATETIME(3) COMMENT '会员到期时间';
ALTER TABLE users MODIFY COLUMN deletedAt DATETIME(3) COMMENT '删除时间';

-- 3. wechat_login_sessions 微信登录会话表
ALTER TABLE wechat_login_sessions COMMENT '微信登录会话表';
ALTER TABLE wechat_login_sessions MODIFY COLUMN id INT COMMENT '会话ID';
ALTER TABLE wechat_login_sessions MODIFY COLUMN sceneStr VARCHAR(191) COMMENT '场景字符串';
ALTER TABLE wechat_login_sessions MODIFY COLUMN ticket VARCHAR(191) COMMENT '票据';
ALTER TABLE wechat_login_sessions MODIFY COLUMN expireAt DATETIME(3) COMMENT '过期时间';
ALTER TABLE wechat_login_sessions MODIFY COLUMN status VARCHAR(191) COMMENT '状态';
ALTER TABLE wechat_login_sessions MODIFY COLUMN openid VARCHAR(191) COMMENT '微信OpenID';
ALTER TABLE wechat_login_sessions MODIFY COLUMN unionid VARCHAR(191) COMMENT '微信UnionID';
ALTER TABLE wechat_login_sessions MODIFY COLUMN userId INT COMMENT '用户ID';
ALTER TABLE wechat_login_sessions MODIFY COLUMN createdAt DATETIME(3) COMMENT '创建时间';
ALTER TABLE wechat_login_sessions MODIFY COLUMN updatedAt DATETIME(3) COMMENT '更新时间';

-- 4. products 商品表
ALTER TABLE products COMMENT '商品表';
ALTER TABLE products MODIFY COLUMN id INT COMMENT '商品ID';
ALTER TABLE products MODIFY COLUMN userId INT COMMENT '用户ID';
ALTER TABLE products MODIFY COLUMN titleOriginal VARCHAR(191) COMMENT '原始标题';
ALTER TABLE products MODIFY COLUMN titleTranslated VARCHAR(191) COMMENT '翻译后标题';
ALTER TABLE products MODIFY COLUMN descriptionOriginal TEXT COMMENT '原始描述';
ALTER TABLE products MODIFY COLUMN descriptionTranslated TEXT COMMENT '翻译后描述';
ALTER TABLE products MODIFY COLUMN price DOUBLE COMMENT '价格';
ALTER TABLE products MODIFY COLUMN rating DOUBLE COMMENT '评分';
ALTER TABLE products MODIFY COLUMN salesCount INT COMMENT '销量';
ALTER TABLE products MODIFY COLUMN category VARCHAR(191) COMMENT '类目';
ALTER TABLE products MODIFY COLUMN specifications JSON COMMENT '规格';
ALTER TABLE products MODIFY COLUMN images JSON COMMENT '图片列表';
ALTER TABLE products MODIFY COLUMN createdAt DATETIME(3) COMMENT '创建时间';
ALTER TABLE products MODIFY COLUMN updatedAt DATETIME(3) COMMENT '更新时间';
ALTER TABLE products MODIFY COLUMN discountedFboStocks INT COMMENT '折扣FBO库存';
ALTER TABLE products MODIFY COLUMN hasDiscountedFboItem BOOLEAN COMMENT '是否有折扣FBO商品';
ALTER TABLE products MODIFY COLUMN isArchived BOOLEAN COMMENT '是否归档';
ALTER TABLE products MODIFY COLUMN isAutoArchived BOOLEAN COMMENT '是否自动归档';
ALTER TABLE products MODIFY COLUMN isDiscounted BOOLEAN COMMENT '是否折扣';
ALTER TABLE products MODIFY COLUMN isKgt BOOLEAN COMMENT '是否KGT';
ALTER TABLE products MODIFY COLUMN isSeasonal BOOLEAN COMMENT '是否季节性';
ALTER TABLE products MODIFY COLUMN isSuper BOOLEAN COMMENT '是否超级商品';
ALTER TABLE products MODIFY COLUMN minPrice DOUBLE COMMENT '最低价格';
ALTER TABLE products MODIFY COLUMN oldPrice DOUBLE COMMENT '原价';
ALTER TABLE products MODIFY COLUMN ozonAvailabilities JSON COMMENT 'Ozon库存信息';
ALTER TABLE products MODIFY COLUMN ozonBarcodes JSON COMMENT 'Ozon条码';
ALTER TABLE products MODIFY COLUMN ozonCategoryId BIGINT COMMENT 'Ozon类目ID';
ALTER TABLE products MODIFY COLUMN ozonColorImages JSON COMMENT 'Ozon颜色图片';
ALTER TABLE products MODIFY COLUMN ozonCommissions JSON COMMENT 'Ozon佣金';
ALTER TABLE products MODIFY COLUMN ozonCurrencyCode VARCHAR(191) COMMENT 'Ozon货币代码';
ALTER TABLE products MODIFY COLUMN ozonErrors JSON COMMENT 'Ozon错误信息';
ALTER TABLE products MODIFY COLUMN ozonImages360 JSON COMMENT 'Ozon360度图片';
ALTER TABLE products MODIFY COLUMN ozonIsPrepaymentAllowed BOOLEAN COMMENT 'Ozon是否允许预付款';
ALTER TABLE products MODIFY COLUMN ozonModelId BIGINT COMMENT 'Ozon型号ID';
ALTER TABLE products MODIFY COLUMN ozonModelInfo JSON COMMENT 'Ozon型号信息';
ALTER TABLE products MODIFY COLUMN ozonOfferId VARCHAR(191) COMMENT 'Ozon报价ID';
ALTER TABLE products MODIFY COLUMN ozonOriginalData JSON COMMENT 'Ozon原始数据';
ALTER TABLE products MODIFY COLUMN ozonPriceIndexes JSON COMMENT 'Ozon价格指数';
ALTER TABLE products MODIFY COLUMN ozonProductId VARCHAR(191) COMMENT 'Ozon商品ID';
ALTER TABLE products MODIFY COLUMN ozonPromotions JSON COMMENT 'Ozon促销信息';
ALTER TABLE products MODIFY COLUMN ozonSku VARCHAR(191) COMMENT 'OzonSKU';
ALTER TABLE products MODIFY COLUMN ozonSources JSON COMMENT 'Ozon来源';
ALTER TABLE products MODIFY COLUMN ozonStatuses JSON COMMENT 'Ozon状态';
ALTER TABLE products MODIFY COLUMN ozonStocks JSON COMMENT 'Ozon库存';
ALTER TABLE products MODIFY COLUMN ozonTypeId BIGINT COMMENT 'Ozon类型ID';
ALTER TABLE products MODIFY COLUMN ozonVisibilityDetails JSON COMMENT 'Ozon可见性详情';
ALTER TABLE products MODIFY COLUMN primaryImages JSON COMMENT '主图列表';
ALTER TABLE products MODIFY COLUMN vat VARCHAR(191) COMMENT '增值税';
ALTER TABLE products MODIFY COLUMN volumeWeight DOUBLE COMMENT '体积重量';
ALTER TABLE products MODIFY COLUMN availabilities VARCHAR(191) COMMENT '可用性';
ALTER TABLE products MODIFY COLUMN colorIndex VARCHAR(191) COMMENT '颜色索引';
ALTER TABLE products MODIFY COLUMN currencyCode VARCHAR(191) COMMENT '货币代码';
ALTER TABLE products MODIFY COLUMN moderateStatus VARCHAR(191) COMMENT '审核状态';
ALTER TABLE products MODIFY COLUMN ozonIndexData JSON COMMENT 'Ozon索引数据';
ALTER TABLE products MODIFY COLUMN primaryImage VARCHAR(191) COMMENT '主图';
ALTER TABLE products MODIFY COLUMN statusName VARCHAR(191) COMMENT '状态名称';
ALTER TABLE products MODIFY COLUMN validationStatus VARCHAR(191) COMMENT '验证状态';
ALTER TABLE products MODIFY COLUMN ozonCreatedAt DATETIME(3) COMMENT 'Ozon创建时间';
ALTER TABLE products MODIFY COLUMN ozonUpdatedAt DATETIME(3) COMMENT 'Ozon更新时间';
ALTER TABLE products MODIFY COLUMN externalIndexData JSON COMMENT '外部索引数据';
ALTER TABLE products MODIFY COLUMN priceIndexValue DOUBLE COMMENT '价格指数值';
ALTER TABLE products MODIFY COLUMN selfMarketplacesIndexData JSON COMMENT '自有市场索引数据';

-- 5. warehouse_items 仓库商品表
ALTER TABLE warehouse_items COMMENT '仓库商品表';
ALTER TABLE warehouse_items MODIFY COLUMN id INT COMMENT '仓库商品ID';
ALTER TABLE warehouse_items MODIFY COLUMN productId INT COMMENT '商品ID';
ALTER TABLE warehouse_items MODIFY COLUMN status VARCHAR(191) COMMENT '状态';
ALTER TABLE warehouse_items MODIFY COLUMN inventoryQuantity INT COMMENT '库存数量';
ALTER TABLE warehouse_items MODIFY COLUMN createdAt DATETIME(3) COMMENT '创建时间';
ALTER TABLE warehouse_items MODIFY COLUMN updatedAt DATETIME(3) COMMENT '更新时间';
ALTER TABLE warehouse_items MODIFY COLUMN userId INT COMMENT '用户ID';
ALTER TABLE warehouse_items MODIFY COLUMN ozonStoreId INT COMMENT 'Ozon店铺ID';
ALTER TABLE warehouse_items MODIFY COLUMN ozonProductId VARCHAR(191) COMMENT 'Ozon商品ID';

-- 9. translation_cache 翻译缓存表
ALTER TABLE translation_cache COMMENT '翻译缓存表';
ALTER TABLE translation_cache MODIFY COLUMN id INT COMMENT '缓存ID';
ALTER TABLE translation_cache MODIFY COLUMN originalText VARCHAR(191) COMMENT '原始文本';
ALTER TABLE translation_cache MODIFY COLUMN translatedText VARCHAR(191) COMMENT '翻译文本';
ALTER TABLE translation_cache MODIFY COLUMN sourceLang VARCHAR(191) COMMENT '源语言';
ALTER TABLE translation_cache MODIFY COLUMN targetLang VARCHAR(191) COMMENT '目标语言';
ALTER TABLE translation_cache MODIFY COLUMN service VARCHAR(191) COMMENT '翻译服务';
ALTER TABLE translation_cache MODIFY COLUMN usageCount INT COMMENT '使用次数';
ALTER TABLE translation_cache MODIFY COLUMN expiresAt DATETIME(3) COMMENT '过期时间';
ALTER TABLE translation_cache MODIFY COLUMN createdAt DATETIME(3) COMMENT '创建时间';
ALTER TABLE translation_cache MODIFY COLUMN updatedAt DATETIME(3) COMMENT '更新时间';

-- 10. api_configs API配置表
ALTER TABLE api_configs COMMENT 'API配置表';
ALTER TABLE api_configs MODIFY COLUMN id INT COMMENT '配置ID';
ALTER TABLE api_configs MODIFY COLUMN userId INT COMMENT '用户ID';
ALTER TABLE api_configs MODIFY COLUMN platform VARCHAR(191) COMMENT '平台';
ALTER TABLE api_configs MODIFY COLUMN config JSON COMMENT '配置内容';
ALTER TABLE api_configs MODIFY COLUMN status VARCHAR(191) COMMENT '状态';
ALTER TABLE api_configs MODIFY COLUMN createdAt DATETIME(3) COMMENT '创建时间';
ALTER TABLE api_configs MODIFY COLUMN updatedAt DATETIME(3) COMMENT '更新时间';

-- 11. pricing_strategies 定价策略表
ALTER TABLE pricing_strategies COMMENT '定价策略表';
ALTER TABLE pricing_strategies MODIFY COLUMN id INT COMMENT '定价策略ID';
ALTER TABLE pricing_strategies MODIFY COLUMN userId INT COMMENT '用户ID';
ALTER TABLE pricing_strategies MODIFY COLUMN name VARCHAR(191) COMMENT '策略名称';
ALTER TABLE pricing_strategies MODIFY COLUMN basePrice DOUBLE COMMENT '基础价格';
ALTER TABLE pricing_strategies MODIFY COLUMN shippingPrice DOUBLE COMMENT '运费';
ALTER TABLE pricing_strategies MODIFY COLUMN tariffRate DOUBLE COMMENT '税率';
ALTER TABLE pricing_strategies MODIFY COLUMN profitRate DOUBLE COMMENT '利润率';
ALTER TABLE pricing_strategies MODIFY COLUMN platformFeeRate DOUBLE COMMENT '平台费率';
ALTER TABLE pricing_strategies MODIFY COLUMN otherCost DOUBLE COMMENT '其他成本';
ALTER TABLE pricing_strategies MODIFY COLUMN isDefault BOOLEAN COMMENT '是否默认';
ALTER TABLE pricing_strategies MODIFY COLUMN createdAt DATETIME(3) COMMENT '创建时间';
ALTER TABLE pricing_strategies MODIFY COLUMN updatedAt DATETIME(3) COMMENT '更新时间';

-- 13. payment_records 支付记录表
ALTER TABLE payment_records COMMENT '支付记录表';
ALTER TABLE payment_records MODIFY COLUMN id INT COMMENT '支付记录ID';
ALTER TABLE payment_records MODIFY COLUMN userId INT COMMENT '用户ID';
ALTER TABLE payment_records MODIFY COLUMN amount DOUBLE COMMENT '金额';
ALTER TABLE payment_records MODIFY COLUMN planType VARCHAR(191) COMMENT '套餐类型';
ALTER TABLE payment_records MODIFY COLUMN status VARCHAR(191) COMMENT '状态';
ALTER TABLE payment_records MODIFY COLUMN paymentMethod VARCHAR(191) COMMENT '支付方式';
ALTER TABLE payment_records MODIFY COLUMN transactionId VARCHAR(191) COMMENT '交易ID';
ALTER TABLE payment_records MODIFY COLUMN createdAt DATETIME(3) COMMENT '创建时间';
ALTER TABLE payment_records MODIFY COLUMN updatedAt DATETIME(3) COMMENT '更新时间';

-- 14. ozon_stores Ozon店铺表
ALTER TABLE ozon_stores COMMENT 'Ozon店铺表';
ALTER TABLE ozon_stores MODIFY COLUMN id INT COMMENT 'Ozon店铺ID';
ALTER TABLE ozon_stores MODIFY COLUMN name VARCHAR(191) COMMENT '店铺名称';
ALTER TABLE ozon_stores MODIFY COLUMN storeId VARCHAR(191) COMMENT '店铺ID';
ALTER TABLE ozon_stores MODIFY COLUMN address VARCHAR(191) COMMENT '地址';
ALTER TABLE ozon_stores MODIFY COLUMN clientId VARCHAR(191) COMMENT '客户端ID';
ALTER TABLE ozon_stores MODIFY COLUMN apiKey VARCHAR(191) COMMENT 'API密钥';
ALTER TABLE ozon_stores MODIFY COLUMN status VARCHAR(191) COMMENT '状态';
ALTER TABLE ozon_stores MODIFY COLUMN productCount INT COMMENT '商品数量';
ALTER TABLE ozon_stores MODIFY COLUMN createdAt DATETIME(3) COMMENT '创建时间';
ALTER TABLE ozon_stores MODIFY COLUMN updatedAt DATETIME(3) COMMENT '更新时间';
ALTER TABLE ozon_stores MODIFY COLUMN apiUrl VARCHAR(191) COMMENT 'API地址';
ALTER TABLE ozon_stores MODIFY COLUMN country VARCHAR(191) COMMENT '国家';
ALTER TABLE ozon_stores MODIFY COLUMN currency VARCHAR(191) COMMENT '货币';
ALTER TABLE ozon_stores MODIFY COLUMN isPremium BOOLEAN COMMENT '是否高级店铺';
ALTER TABLE ozon_stores MODIFY COLUMN legalName VARCHAR(191) COMMENT '法人名称';
ALTER TABLE ozon_stores MODIFY COLUMN ratings JSON COMMENT '评级';
ALTER TABLE ozon_stores MODIFY COLUMN taxNumber VARCHAR(191) COMMENT '税号';

-- 15. images 图片表
ALTER TABLE images COMMENT '图片表';
ALTER TABLE images MODIFY COLUMN id INT COMMENT '图片ID';
ALTER TABLE images MODIFY COLUMN userId INT COMMENT '用户ID';
ALTER TABLE images MODIFY COLUMN fileName VARCHAR(191) COMMENT '文件名';
ALTER TABLE images MODIFY COLUMN fileUrl TEXT COMMENT '文件URL';
ALTER TABLE images MODIFY COLUMN fileSize INT COMMENT '文件大小';
ALTER TABLE images MODIFY COLUMN fileType VARCHAR(191) COMMENT '文件类型';
ALTER TABLE images MODIFY COLUMN width INT COMMENT '宽度';
ALTER TABLE images MODIFY COLUMN height INT COMMENT '高度';
ALTER TABLE images MODIFY COLUMN thumbnailUrl TEXT COMMENT '缩略图URL';
ALTER TABLE images MODIFY COLUMN isDeleted BOOLEAN COMMENT '是否删除';
ALTER TABLE images MODIFY COLUMN deletedAt DATETIME(3) COMMENT '删除时间';
ALTER TABLE images MODIFY COLUMN createdAt DATETIME(3) COMMENT '创建时间';
ALTER TABLE images MODIFY COLUMN updatedAt DATETIME(3) COMMENT '更新时间';

-- 18. ozon_categories Ozon类目表
ALTER TABLE ozon_categories COMMENT 'Ozon类目表';
ALTER TABLE ozon_categories MODIFY COLUMN id INT COMMENT '类目ID';
ALTER TABLE ozon_categories MODIFY COLUMN ozonId BIGINT COMMENT 'Ozon类目ID';
ALTER TABLE ozon_categories MODIFY COLUMN name VARCHAR(191) COMMENT '类目名称';
ALTER TABLE ozon_categories MODIFY COLUMN level INT COMMENT '层级';
ALTER TABLE ozon_categories MODIFY COLUMN parentId INT COMMENT '父类目ID';
ALTER TABLE ozon_categories MODIFY COLUMN ozonParentId BIGINT COMMENT 'Ozon父类目ID';
ALTER TABLE ozon_categories MODIFY COLUMN path VARCHAR(191) COMMENT '路径';
ALTER TABLE ozon_categories MODIFY COLUMN language VARCHAR(191) COMMENT '语言';
ALTER TABLE ozon_categories MODIFY COLUMN createdAt DATETIME(3) COMMENT '创建时间';
ALTER TABLE ozon_categories MODIFY COLUMN updatedAt DATETIME(3) COMMENT '更新时间';

-- 20. products_selection 优选商品表
ALTER TABLE products_selection COMMENT '优选商品表';
ALTER TABLE products_selection MODIFY COLUMN id INT COMMENT '优选商品ID';
ALTER TABLE products_selection MODIFY COLUMN userId INT COMMENT '用户ID';
ALTER TABLE products_selection MODIFY COLUMN name VARCHAR(191) COMMENT '名称';
ALTER TABLE products_selection MODIFY COLUMN ozonId VARCHAR(191) COMMENT 'Ozon商品ID';
ALTER TABLE products_selection MODIFY COLUMN category VARCHAR(191) COMMENT '类目';
ALTER TABLE products_selection MODIFY COLUMN brand VARCHAR(191) COMMENT '品牌';
ALTER TABLE products_selection MODIFY COLUMN price DOUBLE COMMENT '价格';
ALTER TABLE products_selection MODIFY COLUMN originalPrice DOUBLE COMMENT '原价';
ALTER TABLE products_selection MODIFY COLUMN discount INT COMMENT '折扣率';
ALTER TABLE products_selection MODIFY COLUMN rating DOUBLE COMMENT '评分';
ALTER TABLE products_selection MODIFY COLUMN sales INT COMMENT '销量';
ALTER TABLE products_selection MODIFY COLUMN imageUrl TEXT COMMENT '图片URL';
ALTER TABLE products_selection MODIFY COLUMN productUrl TEXT COMMENT '商品链接';
ALTER TABLE products_selection MODIFY COLUMN status VARCHAR(191) COMMENT '状态';
ALTER TABLE products_selection MODIFY COLUMN createdAt DATETIME(3) COMMENT '创建时间';
ALTER TABLE products_selection MODIFY COLUMN updatedAt DATETIME(3) COMMENT '更新时间';

-- 21. products_supply 供应商品表
ALTER TABLE products_supply COMMENT '供应商品表';
ALTER TABLE products_supply MODIFY COLUMN id INT COMMENT '供应商品ID';
ALTER TABLE products_supply MODIFY COLUMN userId INT COMMENT '用户ID';
ALTER TABLE products_supply MODIFY COLUMN name VARCHAR(191) COMMENT '名称';
ALTER TABLE products_supply MODIFY COLUMN category VARCHAR(191) COMMENT '类目';
ALTER TABLE products_supply MODIFY COLUMN brand VARCHAR(191) COMMENT '品牌';
ALTER TABLE products_supply MODIFY COLUMN modelName VARCHAR(191) COMMENT '型号名称';
ALTER TABLE products_supply MODIFY COLUMN alibabaId VARCHAR(191) COMMENT '阿里巴巴ID';
ALTER TABLE products_supply MODIFY COLUMN supplier VARCHAR(191) COMMENT '供应商';
ALTER TABLE products_supply MODIFY COLUMN price DOUBLE COMMENT '价格';
ALTER TABLE products_supply MODIFY COLUMN status VARCHAR(191) COMMENT '状态';
ALTER TABLE products_supply MODIFY COLUMN createdAt DATETIME(3) COMMENT '创建时间';
ALTER TABLE products_supply MODIFY COLUMN updatedAt DATETIME(3) COMMENT '更新时间';

-- 24. user_login_sessions 用户登录会话表
ALTER TABLE user_login_sessions COMMENT '用户登录会话表';

-- 25. translation_usage_monthly 翻译月度用量表
ALTER TABLE translation_usage_monthly COMMENT '翻译月度用量表';

-- 26. ozon_push_events Ozon推送事件表
ALTER TABLE ozon_push_events COMMENT 'Ozon推送事件表';

-- 27. ozon_orders Ozon订单表
ALTER TABLE ozon_orders COMMENT 'Ozon订单表';

-- 28. image_references 图片引用关系表
ALTER TABLE image_references COMMENT '图片引用关系表';

-- 29. ozon_error_codes Ozon错误码翻译表
ALTER TABLE ozon_error_codes COMMENT 'Ozon错误码翻译表';

-- 30. products_selection 货源采集选品表
ALTER TABLE products_selection COMMENT '货源采集选品表';

-- 31. products_supply 货源商品表
ALTER TABLE products_supply COMMENT '货源商品表';

-- 32. ozon_product_templates Ozon商品模板表
ALTER TABLE ozon_product_templates COMMENT 'Ozon商品模板表';

-- 33. supply_sources 货源来源表
ALTER TABLE supply_sources COMMENT '货源来源表';

-- 35. auto_reply_rules 自动回复规则表
ALTER TABLE auto_reply_rules COMMENT '自动回复规则表';

-- 36. finance_accruals 财务应计明细表
ALTER TABLE finance_accruals COMMENT '财务应计明细表';

-- 37. ozon_category_attributes Ozon类目属性表
ALTER TABLE ozon_category_attributes COMMENT 'Ozon类目属性表';

-- 38. ozon_attribute_values Ozon属性值表
ALTER TABLE ozon_attribute_values COMMENT 'Ozon属性值表';

-- 39. ozon_config Ozon配置表
ALTER TABLE ozon_config COMMENT 'Ozon配置表';
