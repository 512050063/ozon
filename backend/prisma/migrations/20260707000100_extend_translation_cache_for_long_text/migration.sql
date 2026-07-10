ALTER TABLE `translation_cache`
  ADD COLUMN `originalHash` VARCHAR(64) NULL;

UPDATE `translation_cache`
SET `originalHash` = SHA2(TRIM(REGEXP_REPLACE(`originalText`, '[[:space:]]+', ' ')), 256)
WHERE `originalHash` IS NULL OR `originalHash` = '';

ALTER TABLE `translation_cache`
  DROP INDEX `translation_cache_originalText_sourceLang_targetLang_key`;

ALTER TABLE `translation_cache`
  MODIFY COLUMN `originalText` LONGTEXT NOT NULL,
  MODIFY COLUMN `translatedText` LONGTEXT NOT NULL,
  MODIFY COLUMN `originalHash` VARCHAR(64) NOT NULL;

CREATE UNIQUE INDEX `translation_cache_originalHash_sourceLang_targetLang_key`
  ON `translation_cache`(`originalHash`, `sourceLang`, `targetLang`);
