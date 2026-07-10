import prisma from '../config/database';

// 创建 Ozon 分类表的 SQL 语句
const createOzonCategoryTableSQL = `
CREATE TABLE IF NOT EXISTS ozon_categories (
  id BIGINT NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  level INT NOT NULL,
  parentId BIGINT NULL,
  path VARCHAR(500) NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'ZH_HANS',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parentId) REFERENCES ozon_categories(id) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// 初始化 Ozon 分类表
const initOzonCategoryTable = async () => {
  try {
    console.log('Initializing ozon_categories table...');

    // 执行 SQL 语句创建表
    await prisma.$executeRawUnsafe(createOzonCategoryTableSQL);

    console.log('ozon_categories table initialized successfully');
  } catch (error) {
    console.error('Error initializing ozon_categories table:', error);
  } finally {
    await prisma.$disconnect();
  }
};

initOzonCategoryTable();
