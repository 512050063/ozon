<template>
  <div class="install-page">
    <main class="install-shell">
      <section class="install-header">
        <div>
          <h1>系统安装</h1>
          <p>完成环境检测、数据库初始化、基础数据导入和管理员创建。</p>
        </div>
        <el-tag :type="status?.installed ? 'success' : 'warning'" effect="plain">
          {{ status?.installed ? '已锁定' : '未安装' }}
        </el-tag>
      </section>

      <el-steps :active="activeStep" finish-status="success" class="install-steps">
        <el-step title="环境检测" />
        <el-step title="数据库" />
        <el-step title="基础数据" />
        <el-step title="管理员" />
        <el-step title="完成" />
      </el-steps>

      <section class="install-content">
        <div v-if="activeStep === 0" class="install-panel">
          <div class="panel-title">
            <h2>环境检测</h2>
            <el-button type="primary" :loading="checking" @click="runCheck">重新检测</el-button>
          </div>
          <el-table :data="checks" border height="360">
            <el-table-column prop="label" label="项目" width="180" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" effect="plain">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="message" label="说明" />
          </el-table>
        </div>

        <div v-if="activeStep === 1" class="install-panel">
          <div class="panel-title">
            <h2>数据库配置</h2>
            <el-button type="primary" :loading="savingDatabase" @click="configureDatabase">创建并同步</el-button>
          </div>
          <el-form :model="databaseForm" label-width="120px" class="install-form">
            <el-form-item label="主机">
              <el-input v-model="databaseForm.host" />
            </el-form-item>
            <el-form-item label="端口">
              <el-input-number v-model="databaseForm.port" :min="1" :max="65535" />
            </el-form-item>
            <el-form-item label="数据库名">
              <el-input v-model="databaseForm.database" />
            </el-form-item>
            <el-form-item label="用户名">
              <el-input v-model="databaseForm.username" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="databaseForm.password" type="password" show-password />
            </el-form-item>
            <el-form-item label="站点域名">
              <el-input v-model="databaseForm.corsOrigin" placeholder="https://example.com" />
            </el-form-item>
            <el-form-item label="Chrome 路径">
              <el-input v-model="databaseForm.chromePath" placeholder="/usr/bin/google-chrome" />
            </el-form-item>
          </el-form>
        </div>

        <div v-if="activeStep === 2" class="install-panel">
          <div class="panel-title">
            <h2>基础数据导入</h2>
            <el-button :loading="importingBaseline" @click="importBaseline">导入基础数据</el-button>
          </div>
          <el-alert
            title="只允许导入 Ozon 类目、商品模板、类目属性、属性值和错误翻译。用户、店铺、订单、财务、Cookie 不会被接受。"
            type="info"
            show-icon
            :closable="false"
          />
          <el-input
            v-model="baselineText"
            type="textarea"
            :rows="12"
            class="baseline-input"
            placeholder='{"version":"2026-07-04","tables":{"ozon_error_codes":[]}}'
          />
        </div>

        <div v-if="activeStep === 3" class="install-panel">
          <div class="panel-title">
            <h2>管理员账号</h2>
            <el-button type="primary" :loading="creatingAdmin" @click="createAdmin">创建管理员</el-button>
          </div>
          <el-form :model="adminForm" label-width="120px" class="install-form">
            <el-form-item label="用户名">
              <el-input v-model="adminForm.username" />
            </el-form-item>
            <el-form-item label="昵称">
              <el-input v-model="adminForm.nickname" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="adminForm.password" type="password" show-password />
            </el-form-item>
          </el-form>
        </div>

        <div v-if="activeStep === 4" class="install-panel finish-panel">
          <h2>完成安装</h2>
          <p>确认数据库、管理员和可选基础数据已准备完成后，锁定安装向导。</p>
          <el-button type="success" size="large" :loading="finalizing" @click="finalizeInstall">
            锁定安装
          </el-button>
        </div>
      </section>

      <section class="install-actions">
        <el-button :disabled="activeStep === 0" @click="activeStep--">上一步</el-button>
        <el-button :disabled="activeStep >= 4" type="primary" @click="activeStep++">下一步</el-button>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue';
  import { ElMessage } from 'element-plus';
  import { installAPI, type InstallCheck, type InstallStatus } from '@/api/installAPI';

  const activeStep = ref(0);
  const status = ref<InstallStatus | null>(null);
  const checks = ref<InstallCheck[]>([]);
  const checking = ref(false);
  const savingDatabase = ref(false);
  const importingBaseline = ref(false);
  const creatingAdmin = ref(false);
  const finalizing = ref(false);
  const baselineText = ref('{\n  "version": "2026-07-04",\n  "tables": {\n    "ozon_error_codes": []\n  }\n}');

  const databaseForm = reactive({
    host: '127.0.0.1',
    port: 3306,
    database: 'ozon_crawler_db',
    username: 'root',
    password: '',
    corsOrigin: '',
    chromePath: '/usr/bin/google-chrome',
  });

  const adminForm = reactive({
    username: 'admin',
    nickname: '系统管理员',
    password: '',
  });

  const statusType = (value: InstallCheck['status']) => {
    if (value === 'pass') return 'success';
    if (value === 'warn') return 'warning';
    return 'danger';
  };

  const statusLabel = (value: InstallCheck['status']) => {
    if (value === 'pass') return '通过';
    if (value === 'warn') return '警告';
    return '失败';
  };

  const loadStatus = async () => {
    const result = await installAPI.getStatus();
    status.value = result.data;
  };

  const runCheck = async () => {
    checking.value = true;
    try {
      const result = await installAPI.runCheck();
      checks.value = result.data || [];
      ElMessage.success('环境检测完成');
    } catch (error: any) {
      ElMessage.error(error.message || '环境检测失败');
    } finally {
      checking.value = false;
    }
  };

  const configureDatabase = async () => {
    savingDatabase.value = true;
    try {
      await installAPI.configureDatabase(databaseForm);
      ElMessage.success('数据库创建并同步完成');
      activeStep.value = 2;
    } catch (error: any) {
      ElMessage.error(error.message || '数据库配置失败');
    } finally {
      savingDatabase.value = false;
    }
  };

  const importBaseline = async () => {
    importingBaseline.value = true;
    try {
      const bundle = JSON.parse(baselineText.value);
      await installAPI.importBaselineData(bundle);
      ElMessage.success('基础数据导入完成');
      activeStep.value = 3;
    } catch (error: any) {
      ElMessage.error(error.message || '基础数据导入失败');
    } finally {
      importingBaseline.value = false;
    }
  };

  const createAdmin = async () => {
    creatingAdmin.value = true;
    try {
      await installAPI.createAdmin(adminForm);
      ElMessage.success('管理员创建完成');
      activeStep.value = 4;
    } catch (error: any) {
      ElMessage.error(error.message || '管理员创建失败');
    } finally {
      creatingAdmin.value = false;
    }
  };

  const finalizeInstall = async () => {
    finalizing.value = true;
    try {
      const result = await installAPI.finalize();
      status.value = result.data;
      ElMessage.success('安装已锁定');
    } catch (error: any) {
      ElMessage.error(error.message || '完成安装失败');
    } finally {
      finalizing.value = false;
    }
  };

  onMounted(async () => {
    await loadStatus();
    await runCheck();
  });
</script>

<style scoped>
  .install-page {
    min-height: 100vh;
    background: #f4f7fb;
    padding: 32px;
  }

  .install-shell {
    max-width: 1080px;
    margin: 0 auto;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 28px;
  }

  .install-header,
  .panel-title,
  .install-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .install-header h1,
  .install-panel h2 {
    margin: 0;
    color: #111827;
  }

  .install-header p,
  .finish-panel p {
    margin: 8px 0 0;
    color: #64748b;
  }

  .install-steps {
    margin: 28px 0;
  }

  .install-content {
    min-height: 470px;
  }

  .install-panel {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 20px;
  }

  .install-form {
    max-width: 620px;
    margin-top: 20px;
  }

  .baseline-input {
    margin-top: 16px;
  }

  .finish-panel {
    display: grid;
    gap: 16px;
    place-items: start;
  }

  .install-actions {
    margin-top: 20px;
    justify-content: flex-end;
  }
</style>
