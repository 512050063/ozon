<template>
  <!-- 统一背景：整个页面一个渐变底 -->
  <div class="login-page min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50/60 to-indigo-100/50">
    <div class="login-aurora login-aurora-a"></div>
    <div class="login-aurora login-aurora-b"></div>
    <div class="login-flow-line login-flow-line-a"></div>
    <div class="login-flow-line login-flow-line-b"></div>
    <div class="login-drift-grid"></div>
    <div class="login-commerce login-commerce-cart">₽</div>
    <div class="login-commerce login-commerce-box">▣</div>
    <div class="login-commerce login-commerce-chart">↗</div>
    <!-- 主内容区 -->
    <div class="relative z-10 min-h-screen flex">
      <!-- Left Sidebar/Brand Section -->
      <div class="hidden lg:flex lg:w-1/2 p-16 flex-col justify-center login-brand-pane">
        <div class="max-w-2xl mx-auto w-full">
          <!-- 左侧品牌区域 - 无边框，直接铺在背景上-->
          <div class="max-w-xl mx-auto w-full">
            <!-- Logo + 标题 -->
            <div class="flex items-center mb-8 login-brand-title">
              <div class="login-logo flex items-center justify-center flex-shrink-0">
                <div class="loader_cube loader_cube--color"></div>
                <div class="loader_cube loader_cube--glowing"></div>
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h1 class="login-brand-name text-[2.75rem] font-bold tracking-tight" style="color: #1e293b">Ozon跨境电商助手</h1>
            </div>
            <p class="text-lg text-slate-500 leading-relaxed mb-8 login-brand-subtitle">
              <span>一站式跨境电商解决方案，让您的</span>
              <span class="login-marquee-vertical" aria-hidden="true">
                <span class="login-marquee-stack">
                  <span>商品轻松卖向全世界</span>
                  <span>订单同步更高效</span>
                  <span>利润数据更清晰</span>
                  <span>商品轻松卖向全世界</span>
                </span>
              </span>
            </p>
            <!-- 功能特性列表-->
            <div class="space-y-6 text-left">
              <div class="login-feature flex items-center cursor-default">
                <div
                  class="login-feature-icon w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div class="ml-4 text-left">
                  <h3 class="text-lg font-semibold text-slate-700">高效商品管理</h3>
                  <p class="text-sm text-slate-500 leading-relaxed">批量导入、编辑、上架商品，一键同步到 Ozon 平台</p>
                </div>
              </div>
              <div class="login-feature flex items-center cursor-default">
                <div
                  class="login-feature-icon w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div class="ml-4 text-left">
                  <h3 class="text-lg font-semibold text-slate-700">智能数据分析</h3>
                  <p class="text-sm text-slate-500 leading-relaxed">实时销售数据、库存分析、利润计算，助力决策</p>
                </div>
              </div>
              <div class="login-feature flex items-center cursor-default">
                <div
                  class="login-feature-icon w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div class="ml-4 text-left">
                  <h3 class="text-lg font-semibold text-slate-700">多角色权限</h3>
                  <p class="text-sm text-slate-500 leading-relaxed">管理员、运营、客服不同权限，团队协作更安全</p>
                </div>
              </div>
            </div>
            <!-- 底部数据展示-->
            <div class="login-metrics border-t border-slate-200/50">
              <div class="flex items-center justify-between text-sm">
                <div class="text-left">
                  <div class="text-xl font-bold text-blue-600">50K+</div>
                  <div class="text-slate-400 mt-0.5">日处理订单</div>
                </div>
                <div class="w-px h-9 bg-slate-200/50"></div>
                <div class="text-left">
                  <div class="text-xl font-bold text-indigo-600">99.9%</div>
                  <div class="text-slate-400 mt-0.5">系统可用</div>
                </div>
                <div class="w-px h-9 bg-slate-200/50"></div>
                <div class="text-left">
                  <div class="text-xl font-bold text-amber-500">&lt;200ms</div>
                  <div class="text-slate-400 mt-0.5">平均响应</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Right Login Form Section -->
      <div class="flex-1 flex items-center justify-center p-8 relative">
        <div class="max-w-md w-full relative z-10">
          <div class="lg:hidden flex items-center mb-8">
            <div
              class="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span class="ml-3 text-xl font-bold text-slate-800">Ozon跨境电商工具</span>
          </div>
          <!-- Login Card - 毛玻璃效果-->
          <div
            class="login-card bg-white/[0.65] backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-400/25 p-8 relative border border-white/70 ring-1 ring-black/[0.05]">
            <!-- WeChat Scan Icon in Top Right - hide on register and forgot password -->
            <button v-if="!showRegister && !showForgotPassword" @click="toggleWeChatLogin"
              class="login-wechat-toggle absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <img v-if="!showWeChat" src="@/assets/images/icons/ewm.png" alt="二维码登录" class="w-8 h-8" />
              <img v-else src="@/assets/images/icons/fh.png" alt="返回账号登录" class="w-8 h-8" />
            </button>
            <div class="mb-8 text-center login-card-heading">
              <h1 class="text-2xl font-bold text-slate-800 mb-2">
                {{
                  showWeChat
                    ? '微信扫码登录'
                    : showRegister
                      ? '创建账户'
                      : showForgotPassword
                        ? forgotPasswordStep === 1
                          ? '重置密码'
                          : '设置新密码'
                        : '欢迎回来'
                }}
              </h1>
              <p class="text-slate-500 text-sm">
                {{
                  showWeChat
                    ? '扫描二维码快速登录'
                    : showRegister
                      ? '填写信息注册新账号'
                      : showForgotPassword
                        ? forgotPasswordStep === 1
                          ? '请输入您的手机号获取验证码'
                          : '请设置新密码'
                        : '请登录您的账户继续使用'
                }}
              </p>
            </div>
            <!-- WeChat QR Code Section -->
            <div v-if="showWeChat" class="text-center login-panel-swap">
              <div class="bg-white p-6 rounded-lg border border-slate-200 shadow-sm inline-block">
                <div
                  class="w-48 h-48 bg-white border-2 border-slate-300 rounded-lg flex items-center justify-center mx-auto overflow-hidden">
                  <div v-if="loginStatus === 'loading'" class="flex flex-col items-center justify-center">
                    <el-icon class="w-12 h-12 text-blue-600 is-loading">
                      <Loading />
                    </el-icon>
                    <p class="text-sm text-slate-500 mt-2">正在生成二维码...</p>
                  </div>
                  <img v-else-if="loginStatus === 'pending' || loginStatus === 'scanned'" :src="qrCodeUrl" alt="微信登录二维码"
                    class="w-full h-full object-cover" />
                  <div v-else-if="loginStatus === 'expired'" class="flex flex-col items-center justify-center">
                    <el-icon class="w-12 h-12 text-red-500"><CircleClose /></el-icon>
                    <p class="text-sm text-slate-500 mt-2">二维码已过期</p>
                    <el-button type="primary" class="mt-3" @click="getWechatQRCode">刷新二维码</el-button>
                  </div>
                  <div v-else class="flex flex-col items-center justify-center">
                    <el-icon class="w-12 h-12 text-slate-400"><WarningFilled /></el-icon>
                    <p class="text-sm text-slate-500 mt-2">获取二维码失败</p>
                    <el-button type="primary" class="mt-3" @click="getWechatQRCode">重新获取</el-button>
                  </div>
                </div>
                <div class="mt-4">
                  <p v-if="loginStatus === 'pending'" class="text-sm text-slate-500">请使用微信扫描二维码</p>
                  <p v-else-if="loginStatus === 'scanned'" class="text-sm text-green-600">
                    扫码成功，请在微信中确认登录
                  </p>
                  <p v-else-if="loginStatus === 'confirmed'" class="text-sm text-green-600">登录成功，正在跳转...</p>
                </div>
              </div>
            </div>
            <!-- Login/Register/Forgot Password Form Section -->
            <div v-else>
              <!-- Forgot Password Section -->
              <div v-if="showForgotPassword">
                <div class="form-container step-1">
                  <el-form ref="forgotFormRef" :model="forgotForm" :rules="forgotRules"
                    @submit.prevent="handleForgotPassword">
                    <template v-if="!forgotPasswordVerified">
                      <el-form-item prop="username">
                        <el-input v-model="forgotForm.username" placeholder="请输入用户名" size="large" clearable>
                          <template #prefix><el-icon>
                              <user />
                            </el-icon></template>
                        </el-input>
                      </el-form-item>
                      <el-form-item prop="phone">
                        <el-input
                          v-model="forgotForm.phone"
                          placeholder="请输入手机号"
                          size="large"
                          maxlength="11"
                          inputmode="numeric"
                          clearable
                          @input="handleForgotPhoneInput"
                        >
                          <template #prefix><el-icon>
                              <iphone />
                            </el-icon></template>
                        </el-input>
                      </el-form-item>
                      <el-form-item prop="verificationCode">
                        <el-input
                          v-model="forgotForm.verificationCode"
                          placeholder="请输入验证码"
                          size="large"
                          maxlength="6"
                          inputmode="numeric"
                          class="forgot-code-field"
                          @input="handleForgotCodeInput"
                        >
                          <template #prefix><el-icon>
                              <key />
                            </el-icon></template>
                          <template #suffix>
                          <button
                            type="button"
                            class="forgot-code-button"
                            :disabled="forgotCodeButtonDisabled"
                            @click="sendForgotCode"
                          >
                            {{ forgotCodeButtonText }}
                          </button>
                          </template>
                        </el-input>
                      </el-form-item>
                    </template>
                    <template v-else>
                      <el-form-item prop="newPassword">
                        <el-input v-model="forgotForm.newPassword" type="password" placeholder="请输入新密码（至少6位）" size="large"
                          show-password>
                          <template #prefix><el-icon>
                              <lock />
                            </el-icon></template>
                        </el-input>
                      </el-form-item>
                      <el-form-item prop="confirmPassword">
                        <el-input v-model="forgotForm.confirmPassword" type="password" placeholder="请再次输入新密码" size="large"
                          show-password>
                          <template #prefix><el-icon>
                              <lock />
                            </el-icon></template>
                        </el-input>
                      </el-form-item>
                    </template>
                    <el-form-item>
                      <el-button type="primary" size="large" :loading="authStore.isLoading" class="w-full"
                        native-type="submit">{{
                          authStore.isLoading
                            ? (forgotPasswordVerified ? '重置中...' : '验证中...')
                            : (forgotPasswordVerified ? '重置密码' : '验证身份') }}</el-button>
                    </el-form-item>
                  </el-form>
                  <div class="mt-6 text-center">
                    <el-button type="primary" link class="text-sm" @click="goBackToLogin">返回登录</el-button>
                  </div>
                </div>
              </div>
              <!-- Login Form -->
              <div v-else-if="!showRegister" class="login-panel-swap">
                <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" @submit.prevent="handleLogin">
                  <el-form-item prop="username">
                    <el-input v-model="loginForm.username" placeholder="请输入用户名" size="large" clearable>
                      <template #prefix><el-icon>
                          <user />
                        </el-icon></template>
                    </el-input>
                  </el-form-item>
                  <el-form-item prop="password">
                    <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" size="large"
                      show-password>
                      <template #prefix><el-icon>
                          <lock />
                        </el-icon></template>
                    </el-input>
                  </el-form-item>
                  <div class="flex items-center justify-between mb-4">
                    <el-checkbox v-model="loginForm.rememberMe" @change="saveRememberMe">记住我</el-checkbox>
                    <el-button type="primary" link class="login-inline-link" @click="goToForgotPassword">忘记密码?</el-button>
                  </div>
                  <el-form-item>
                    <el-button type="primary" size="large" :loading="authStore.isLoading" class="w-full"
                      native-type="submit">{{
                        authStore.isLoading ? '登录中...' : '登录' }}</el-button>
                  </el-form-item>
                </el-form>
                <div class="login-register-row mt-6">
                  <span class="text-sm text-slate-500">还没有账号</span>
                  <el-button type="primary" link class="login-inline-link text-sm" @click="showRegister = true">立即注册</el-button>
                </div>
              </div>
              <!-- Register Form -->
              <div v-else class="login-panel-swap">
                <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules"
                  @submit.prevent="handleRegister">
                  <el-form-item prop="username">
                    <el-input v-model="registerForm.username" placeholder="请输入用户名（4-20位字母数字）" size="large"
                      maxlength="20" clearable>
                      <template #prefix><el-icon>
                          <user />
                        </el-icon></template>
                    </el-input>
                  </el-form-item>
                  <el-form-item prop="password">
                    <el-input v-model="registerForm.password" type="password" placeholder="请输入密码（至少6位）" size="large"
                      show-password>
                      <template #prefix><el-icon>
                          <lock />
                        </el-icon></template>
                    </el-input>
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" size="large" :loading="authStore.isLoading" class="w-full"
                      native-type="submit">{{
                        authStore.isLoading ? '注册中...' : '注册' }}</el-button>
                  </el-form-item>
                </el-form>
                <div class="mt-6 text-center">
                  <span class="text-sm text-slate-500">已有账户？</span>
                  <el-button type="primary" link class="text-sm ml-1" @click="showRegister = false">立即登录</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Register Success Modal -->
    <el-dialog v-model="showRegisterSuccessModal" title="" width="420px" center :close-on-click-modal="false"
      :show-close="false">
      <div class="text-center">
        <div class="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-6">
          <el-icon class="w-8 h-8 text-green-600"><SuccessFilled /></el-icon>
        </div>
        <h3 class="text-xl font-bold text-slate-800 mb-2">注册申请已提交</h3>
        <p class="text-slate-500 mb-2">注册申请已提交，等待管理员审核</p>
        <p class="text-xs text-slate-400 mb-6">请留意管理员审核结果</p>
        <el-button type="primary" size="large" @click="handleModalConfirm">去登录</el-button>
      </div>
    </el-dialog>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/authStore';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import { appConfirm } from '@/utils/appConfirm';
import { User, Lock, Iphone, Key, Loading, CircleClose, SuccessFilled, WarningFilled } from '@element-plus/icons-vue';
import { authAPI } from '@/api/authAPI';
const router = useRouter();
const authStore = useAuthStore();
const ACTIVE_SESSION_EXISTS = 'ACTIVE_SESSION_EXISTS';
// Form refs
const loginFormRef = ref<FormInstance>();
const registerFormRef = ref<FormInstance>();
const forgotFormRef = ref<FormInstance>();
// 微信登录相关状态
const qrCodeUrl = ref('');
const sceneStr = ref('');
const qrCodeExpireAt = ref<Date | null>(null);
const loginStatus = ref('idle');
const statusPollingInterval = ref<number | null>(null);
const showWeChat = ref(false);
const showRegister = ref(false);
const showForgotPassword = ref(false);
const forgotPasswordStep = ref(1);
const forgotPasswordVerified = ref(false);
const forgotPasswordResetToken = ref('');
const showRegisterSuccessModal = ref(false);
// Login form
const loginForm = ref({
  username: '',
  password: '',
  rememberMe: false,
});
const loginRules = computed<FormRules>(() => ({
  username: [{ required: true, message: '请输入用户名或手机号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}));
// Register form
const registerForm = ref({
  username: '',
  password: '',
});
const registerRules = computed<FormRules>(() => ({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9]{4,20}$/, message: '用户名只能包含4-20位字母和数字', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少需要6位字符', trigger: 'blur' },
  ],
}));
// Forgot password form
const forgotForm = ref({
  username: '',
  phone: '',
  verificationCode: '',
  newPassword: '',
  confirmPassword: '',
});
const phonePattern = /^1[3-9]\d{9}$/;
const digitsPattern = /^\d+$/;
const forgotRules = computed<FormRules>(() => ({
  ...(forgotPasswordVerified.value
    ? {
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, message: '密码至少需要6位字符', trigger: 'blur' },
        ],
        confirmPassword: [
          { required: true, message: '请再次输入新密码', trigger: 'blur' },
          {
            validator: (_rule: any, value: string, callback: (error?: Error) => void) => {
              if (value !== forgotForm.value.newPassword) {
                callback(new Error('两次输入的密码不一致'));
                return;
              }
              callback();
            },
            trigger: 'blur',
          },
        ],
      }
    : {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        phone: [
          { required: true, message: '请输入手机号', trigger: 'blur' },
          { len: 11, message: '手机号必须为11位数字', trigger: 'blur' },
          { pattern: digitsPattern, message: '手机号只能输入数字', trigger: 'blur' },
          { pattern: phonePattern, message: '请输入有效的手机号', trigger: 'blur' },
        ],
        verificationCode: [
          { required: true, message: '请输入验证码', trigger: 'blur' },
          { len: 6, message: '验证码必须为6位数字', trigger: 'blur' },
          { pattern: digitsPattern, message: '验证码只能输入数字', trigger: 'blur' },
        ],
      }),
}));
// Code button states
const forgotCodeButtonText = ref('获取验证码');
const forgotCodeButtonDisabled = ref(false);
let forgotCodeTimer: ReturnType<typeof setInterval> | null = null;
const toggleWeChatLogin = () => {
  if (showWeChat.value) {
    showWeChat.value = false;
    stopPollingLoginStatus();
    loginStatus.value = 'idle';
    qrCodeUrl.value = '';
    sceneStr.value = '';
  } else {
    showWeChat.value = true;
    getWechatQRCode();
  }
};
const getWechatQRCode = async () => {
  try {
    loginStatus.value = 'loading';
    const response = await authAPI.getWechatLoginQRCode();
    if (response.success && response.data) {
      qrCodeUrl.value = response.data.qrCodeUrl;
      sceneStr.value = response.data.sceneStr;
      qrCodeExpireAt.value = new Date(response.data.expireAt);
      loginStatus.value = 'pending';
      startPollingLoginStatus();
    } else {
      loginStatus.value = 'error';
      console.error('获取微信登录二维码失败', response.message);
    }
  } catch (error) {
    loginStatus.value = 'error';
    console.error('获取微信登录二维码失败', error);
  }
};
const startPollingLoginStatus = () => {
  stopPollingLoginStatus();
  statusPollingInterval.value = window.setInterval(async () => {
    try {
      const response = await authAPI.checkWechatLoginStatus(sceneStr.value);
      if (response.success && response.data) {
        const status = response.data.status;
        loginStatus.value = status;
        if (status === 'confirmed' && response.data.token && response.data.user) {
          stopPollingLoginStatus();
          authStore.loginWithToken(response.data.token, response.data.user);
          router.push('/dashboard');
        } else if (status === 'expired' || status === 'invalid') {
          stopPollingLoginStatus();
        }
      }
    } catch (error) {
      console.error('查询微信登录状态失败', error);
    }
  }, 2000);
};
const stopPollingLoginStatus = () => {
  if (statusPollingInterval.value) {
    clearInterval(statusPollingInterval.value);
    statusPollingInterval.value = null;
  }
};
onMounted(() => {
  const saved = localStorage.getItem('rememberMe');
  if (saved === 'true') {
    loginForm.value.rememberMe = true;
    const savedPhone = localStorage.getItem('savedPhone');
    if (savedPhone) loginForm.value.username = savedPhone;
  }
});
const goToForgotPassword = () => {
  showForgotPassword.value = true;
  forgotPasswordVerified.value = false;
  forgotPasswordResetToken.value = '';
};
const goBackToLogin = () => {
  showForgotPassword.value = false;
  forgotPasswordVerified.value = false;
  forgotPasswordResetToken.value = '';
  forgotForm.value = { username: '', phone: '', verificationCode: '', newPassword: '', confirmPassword: '' };
  clearForgotCodeCountdown();
};
onUnmounted(() => {
  stopPollingLoginStatus();
  clearForgotCodeCountdown();
});
const saveRememberMe = () => {
  if (loginForm.value.rememberMe) {
    localStorage.setItem('rememberMe', 'true');
    localStorage.setItem('savedPhone', loginForm.value.username);
  } else {
    localStorage.setItem('rememberMe', 'false');
    localStorage.removeItem('savedPhone');
  }
};
const normalizeDigits = (value: string, maxLength: number) => value.replace(/\D/g, '').slice(0, maxLength);
const handleForgotPhoneInput = (value: string) => {
  forgotForm.value.phone = normalizeDigits(value, 11);
};
const handleForgotCodeInput = (value: string) => {
  forgotForm.value.verificationCode = normalizeDigits(value, 6);
};
const clearForgotCodeCountdown = () => {
  if (forgotCodeTimer) {
    clearInterval(forgotCodeTimer);
    forgotCodeTimer = null;
  }
  forgotCodeButtonText.value = '获取验证码';
  forgotCodeButtonDisabled.value = false;
};
const startForgotCodeCountdown = (seconds: number) => {
  if (forgotCodeTimer) {
    clearInterval(forgotCodeTimer);
  }
  let countdown = Math.max(1, Math.ceil(seconds));
  forgotCodeButtonDisabled.value = true;
  forgotCodeButtonText.value = `${countdown}s后重发`;
  forgotCodeTimer = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearForgotCodeCountdown();
      return;
    }
    forgotCodeButtonText.value = `${countdown}s后重发`;
  }, 1000);
};
const sendForgotCode = async () => {
  if (!forgotForm.value.username) { ElMessage.warning('请先输入用户名'); return; }
  forgotForm.value.phone = normalizeDigits(forgotForm.value.phone, 11);
  if (!phonePattern.test(forgotForm.value.phone)) { ElMessage.warning('请输入有效的手机号'); return; }
  forgotCodeButtonDisabled.value = true;
  forgotCodeButtonText.value = '发送中...';
  try {
    const response = await authStore.sendVerificationCode(forgotForm.value.phone, 'forgot_password', forgotForm.value.username);
    if (response?.success) {
      ElMessage.success(response.message || '验证码已发送');
      startForgotCodeCountdown(response.data?.cooldownSeconds || 60);
      return;
    }
    const remainingSeconds = response?.data?.remainingSeconds;
    if (remainingSeconds) {
      ElMessage.warning(response.message || `验证码已发送，请 ${remainingSeconds} 秒后再试`);
      startForgotCodeCountdown(remainingSeconds);
      return;
    }
    ElMessage.error(response?.message || authStore.error || '发送失败');
    clearForgotCodeCountdown();
  } catch (error: any) {
    ElMessage.error(error.message || '发送失败');
    clearForgotCodeCountdown();
  }
};
const handleLogin = async () => {
  if (!loginFormRef.value) return;
  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return;
    authStore.error = null;
    authStore.errorCode = null;
    const success = await authStore.login(loginForm.value.username, loginForm.value.password);
    if (success) {
      router.push('/dashboard');
      return;
    }

    if (authStore.errorCode === ACTIVE_SESSION_EXISTS) {
      try {
        await appConfirm({
          title: '账号已登录',
          message: '该账号已在其他位置登录，继续登录将强制下线原设备，是否继续？',
          confirmText: '继续登录',
          cancelText: '取消',
          variant: 'warning',
          icon: 'warning',
        });
        const forcedSuccess = await authStore.login(loginForm.value.username, loginForm.value.password, { force: true });
        if (forcedSuccess) {
          router.push('/dashboard');
        } else {
          ElMessage.error(authStore.error || '登录失败，请检查用户名或密码是否正确');
        }
      } catch {
        // 用户取消继续登录时留在当前页面。
      }
      return;
    }

    ElMessage.error(authStore.error || '登录失败，请检查用户名或密码是否正确');
  });
};
const handleRegister = async () => {
  if (!registerFormRef.value) { ElMessage.error('表单引用未定义'); return; }
  await registerFormRef.value.validate(async (valid) => {
    if (!valid) { ElMessage.warning('请检查表单填写是否正确'); return; }
    authStore.error = null;
    const success = await authStore.register(registerForm.value.username, registerForm.value.password);
    if (success) {
      showRegisterSuccessModal.value = true;
    } else { ElMessage.error(authStore.error || '注册失败，请稍后重试'); }
  });
};
const handleForgotPassword = async () => {
  if (!forgotFormRef.value) return;
  await forgotFormRef.value.validate(async (valid) => {
    if (!valid) return;
    authStore.error = null;
    if (!forgotPasswordVerified.value) {
      const resetToken = await authStore.verifyForgotPasswordCode(
        forgotForm.value.username,
        forgotForm.value.phone,
        forgotForm.value.verificationCode
      );
      if (resetToken) {
        forgotPasswordResetToken.value = resetToken;
        forgotPasswordVerified.value = true;
        ElMessage.success('身份验证成功，请设置新密码');
      } else {
        ElMessage.error(authStore.error || '身份验证失败');
      }
      return;
    }

    const success = await authStore.forgotPassword(forgotPasswordResetToken.value, forgotForm.value.newPassword);
    if (success) {
      ElMessage.success('密码重置成功，请使用新密码登录');
      goBackToLogin();
    } else {
      ElMessage.error(authStore.error || '密码重置失败');
    }
  });
};
const handleModalConfirm = () => {
  showRegisterSuccessModal.value = false;
  showRegister.value = false;
  loginForm.value = { username: '', password: '', rememberMe: false };
};
</script>
<style scoped>
@keyframes loginBgFlow {
  0% {
    transform: translate3d(-2%, -1%, 0) rotate(-4deg);
  }

  50% {
    transform: translate3d(3%, 2%, 0) rotate(3deg);
  }

  100% {
    transform: translate3d(-2%, -1%, 0) rotate(-4deg);
  }
}

@keyframes loginLineTravel {
  0% {
    transform: translateX(-18%) skewX(-18deg);
    opacity: 0.12;
  }

  45% {
    opacity: 0.34;
  }

  100% {
    transform: translateX(18%) skewX(-18deg);
    opacity: 0.12;
  }
}

@keyframes loginGridDrift {
  0% {
    background-position: 0 0, 0 0;
  }

  100% {
    background-position: 32px 24px, -28px 36px;
  }
}

@keyframes loginRiseIn {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes loginCardFloat {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-7px);
  }
}

@keyframes loginLogoPulse {
  0%,
  100% {
    box-shadow: 0 14px 28px rgba(37, 99, 235, 0.22);
  }

  50% {
    box-shadow: 0 18px 40px rgba(79, 70, 229, 0.34);
  }
}

@keyframes loginLogoTilt {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }

  35% {
    transform: rotate(7deg) scale(1.04);
  }

  65% {
    transform: rotate(-5deg) scale(0.99);
  }
}

@keyframes loginLoaderColor {
  0%,
  100% {
    border-radius: 18px;
    transform: rotate(0deg) scale(0.78);
  }

  50% {
    border-radius: 24px;
    transform: rotate(90deg) scale(1.02);
  }
}

@keyframes loginIconBeat {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }

  45% {
    transform: translateY(-4px) scale(1.05);
  }
}

@keyframes loginTextMarquee {
  0% {
    transform: translateY(0);
  }

  24% {
    transform: translateY(0);
  }

  33% {
    transform: translateY(-25%);
  }

  57% {
    transform: translateY(-25%);
  }

  66% {
    transform: translateY(-50%);
  }

  90% {
    transform: translateY(-50%);
  }

  100% {
    transform: translateY(-75%);
  }
}

@keyframes loginTextBgSweep {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

@keyframes loginCommerceFloat {
  0%,
  100% {
    transform: translate3d(0, 0, 0) rotate(-8deg);
    opacity: 0.16;
  }

  50% {
    transform: translate3d(10px, -16px, 0) rotate(6deg);
    opacity: 0.28;
  }
}

@keyframes loginShimmer {
  0% {
    transform: translateX(-120%) skewX(-18deg);
  }

  100% {
    transform: translateX(180%) skewX(-18deg);
  }
}

.login-page::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background:
    linear-gradient(115deg, transparent 0%, rgba(255, 255, 255, 0.34) 42%, transparent 56%),
    radial-gradient(circle at 70% 18%, rgba(59, 130, 246, 0.12), transparent 30%);
  opacity: 0.72;
}

.login-aurora {
  position: absolute;
  inset: auto;
  width: 76vw;
  height: 42vh;
  pointer-events: none;
  border-radius: 42% 58% 55% 45%;
  filter: blur(46px);
  opacity: 0.45;
  animation: loginBgFlow 16s ease-in-out infinite;
}

.login-aurora-a {
  top: -14vh;
  left: -18vw;
  background: linear-gradient(110deg, rgba(96, 165, 250, 0.42), rgba(125, 211, 252, 0.18), transparent);
}

.login-aurora-b {
  right: -22vw;
  bottom: -16vh;
  background: linear-gradient(110deg, transparent, rgba(129, 140, 248, 0.22), rgba(251, 191, 36, 0.18));
  animation-duration: 19s;
  animation-direction: reverse;
}

.login-flow-line {
  position: absolute;
  left: 4%;
  right: 4%;
  height: 1px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.18), rgba(14, 165, 233, 0.28), transparent);
  animation: loginLineTravel 10s ease-in-out infinite;
}

.login-flow-line-a {
  top: 28%;
}

.login-flow-line-b {
  bottom: 24%;
  animation-delay: -4s;
  animation-duration: 13s;
}

.login-drift-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.12;
  background-image:
    linear-gradient(rgba(30, 41, 59, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(30, 41, 59, 0.08) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.88), transparent 78%);
  animation: loginGridDrift 18s linear infinite;
}

.login-commerce {
  position: absolute;
  z-index: 0;
  pointer-events: none;
  color: rgba(37, 99, 235, 0.18);
  font-size: 38px;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 18px 38px rgba(59, 130, 246, 0.12);
  animation: loginCommerceFloat 9s ease-in-out infinite;
}

.login-commerce-cart {
  top: 18%;
  left: 43%;
}

.login-commerce-box {
  right: 13%;
  bottom: 17%;
  color: rgba(79, 70, 229, 0.16);
  animation-delay: -2.8s;
}

.login-commerce-chart {
  left: 9%;
  bottom: 13%;
  color: rgba(245, 158, 11, 0.18);
  animation-delay: -5.4s;
}

.login-brand-title,
.login-brand-subtitle,
.login-feature,
.login-metrics,
.login-card {
  opacity: 0;
  animation: loginRiseIn 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.login-brand-subtitle {
  animation-delay: 0.08s;
}

.login-feature:nth-child(1) {
  animation-delay: 0.16s;
}

.login-feature:nth-child(2) {
  animation-delay: 0.26s;
}

.login-feature:nth-child(3) {
  animation-delay: 0.36s;
}

.login-metrics {
  animation-delay: 0.46s;
}

.login-card {
  overflow: hidden;
  isolation: isolate;
  animation: loginRiseIn 0.76s cubic-bezier(0.22, 1, 0.36, 1) 0.12s forwards;
}

.login-card > :not(.login-wechat-toggle) {
  position: relative;
  z-index: 1;
}

.login-card::before {
  position: absolute;
  inset: 1px;
  z-index: -1;
  content: "";
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(219, 234, 254, 0.4), rgba(255, 255, 255, 0.7));
}

.login-card::after {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 46%;
  pointer-events: none;
  content: "";
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.34), transparent);
  animation: loginShimmer 5.8s ease-in-out infinite;
}

.login-wechat-toggle {
  position: absolute !important;
  top: 1rem !important;
  right: 1rem !important;
  z-index: 2 !important;
}

.login-logo {
  position: relative;
  display: flex;
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-right: 18px;
  border: 0;
  border-radius: 24px;
  background: transparent;
  box-shadow: none;
  isolation: isolate;
}

.login-logo .loader_cube {
  position: absolute;
  inset: 6px;
  width: auto;
  height: auto;
  border: 0;
  border-radius: 20px;
  outline: 0;
}

.login-logo .loader_cube--color {
  z-index: 1;
  background: linear-gradient(135deg, #36dff8 0%, #5f7cff 52%, #d946ef 100%);
  filter: none;
  animation: loginLoaderColor 2.8s ease-in-out infinite;
}

.login-logo .loader_cube--glowing {
  z-index: 2;
  border: 0;
  outline: 0;
  background-color: rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 0 14px rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(3px);
}

.login-logo svg {
  display: none;
}

.login-brand-name {
  min-width: max-content;
  font-size: clamp(2.25rem, 3vw, 2.6rem) !important;
  line-height: 1.12;
  letter-spacing: 0;
  white-space: nowrap;
}

.login-metrics {
  width: fit-content;
  max-width: 100%;
  padding-top: 14px !important;
  margin-top: 24px !important;
}

.login-metrics > div {
  justify-content: flex-start;
  gap: 28px;
}

.login-metrics > div > .text-left {
  min-width: 92px;
}

.login-metrics .w-px {
  flex: 0 0 auto;
  height: 32px;
}

.login-brand-subtitle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 520px;
  min-height: 36px;
  padding: 0 12px;
  overflow: visible;
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.18), rgba(219, 234, 254, 0.48), rgba(255, 255, 255, 0.18));
  background-size: 220% 100%;
  color: #64748b;
  font-size: 17px;
  animation: loginRiseIn 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards, loginTextBgSweep 7s ease-in-out infinite;
  white-space: nowrap;
}

.login-brand-subtitle::after {
  position: absolute;
  right: 14px;
  bottom: 5px;
  left: 14px;
  height: 1px;
  content: "";
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.7), rgba(245, 158, 11, 0.42), transparent);
  opacity: 0.5;
}

.login-marquee-vertical {
  position: relative;
  display: inline-block;
  width: 178px;
  height: 26px;
  overflow: hidden;
  color: #2563eb;
  font-weight: 700;
  vertical-align: middle;
}

.login-marquee-stack {
  display: flex;
  flex-direction: column;
  height: 400%;
  animation: loginTextMarquee 6.4s cubic-bezier(0.8, 0, 0.2, 1) infinite;
}

.login-marquee-stack > span {
  display: flex;
  height: 25%;
  align-items: center;
  white-space: nowrap;
}

.login-feature {
  position: relative;
  gap: 16px;
  padding: 5px 0;
  margin-left: 0;
}

.login-feature-icon {
  width: 42px !important;
  height: 42px !important;
  border-radius: 14px !important;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(239, 246, 255, 0.48)) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    0 10px 22px rgba(37, 99, 235, 0.08);
  animation: loginIconBeat 2.9s ease-in-out infinite;
}

.login-feature-icon svg {
  width: 21px;
  height: 21px;
  stroke-width: 2.2;
}

.login-feature > div:last-child {
  margin-left: 0 !important;
}

.login-feature h3 {
  color: #243247;
  font-size: 16px;
  line-height: 22px;
  font-weight: 750;
}

.login-feature p {
  margin-top: 3px;
  color: #64748b;
  font-size: 13px;
  line-height: 20px;
}

.login-feature:nth-child(2) .login-feature-icon {
  animation-delay: 0.22s;
}

.login-feature:nth-child(3) .login-feature-icon {
  animation-delay: 0.44s;
}

.login-panel-swap {
  animation: loginRiseIn 0.34s ease-out both;
}

.login-register-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  line-height: 22px;
}

.login-card :deep(.login-inline-link.el-button) {
  display: inline-flex;
  width: auto;
  height: 22px;
  min-height: 0;
  padding: 0;
  vertical-align: middle;
}

.login-card :deep(.el-input__wrapper) {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.84);
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.login-card :deep(.el-input__wrapper:hover),
.login-card :deep(.el-input__wrapper.is-focus) {
  transform: translateY(-1px);
  background: #ffffff;
  box-shadow:
    0 0 0 1px rgba(59, 130, 246, 0.48) inset,
    0 10px 24px rgba(59, 130, 246, 0.10) !important;
}

.login-card :deep(.forgot-code-field .el-input__inner) {
  padding-right: 8px;
}

.login-card :deep(.forgot-code-field .el-input__suffix) {
  top: 0;
  right: 0;
  bottom: 0;
  height: 100%;
}

.login-card :deep(.forgot-code-field .el-input__suffix-inner) {
  display: flex;
  height: 100%;
  align-items: center;
}

.forgot-code-button {
  display: inline-flex;
  width: 96px;
  min-width: 0;
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  border: 0;
  border-left: 1px solid rgba(203, 213, 225, 0.72);
  border-radius: 0 12px 12px 0;
  color: #2563eb;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  transition:
    color 0.18s ease,
    background-color 0.18s ease;
}

.forgot-code-button:hover:not(:disabled) {
  color: #1d4ed8;
  background: rgba(255, 255, 255, 0.12);
}

.forgot-code-button:disabled {
  color: #94a3b8;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.12);
}

.login-card :deep(.el-button--primary:not(.is-link)) {
  position: relative;
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%) !important;
  box-shadow: 0 12px 22px rgba(37, 99, 235, 0.22);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    filter 0.18s ease;
}

.login-card :deep(.el-button--primary:not(.is-link):hover) {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(37, 99, 235, 0.28);
  filter: saturate(1.08);
}

.login-card :deep(.el-button--primary:not(.is-link):active) {
  transform: translateY(0);
}

.login-card :deep(.el-button--primary:not(.is-link)::before) {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -45%;
  width: 38%;
  content: "";
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.34), transparent);
  transform: skewX(-18deg);
}

.login-card :deep(.el-button--primary:not(.is-link):hover::before) {
  animation: loginShimmer 0.95s ease;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }

  20% {
    opacity: 1;
    transform: translateY(0);
  }

  80% {
    opacity: 1;
    transform: translateY(0);
  }

  100% {
    opacity: 0;
    transform: translateY(10px);
  }
}

@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.form-container {
  transition: all 0.3s ease;
}

.step-1 {
  animation: slideInFromLeft 0.4s ease-out;
}

.step-2 {
  animation: slideInFromRight 0.4s ease-out;
}

.el-button {
  transition: all 0.2s ease;
}

.el-input__wrapper {
  transition: all 0.2s ease;
}

.el-form-item {
  margin-bottom: 24px !important;
}

.el-form-item:last-child {
  margin-bottom: 32px !important;
}

.bg-gradient-to-r {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: 200% 200%;
  animation: gradientShift 3s ease infinite;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

.space-y-8>div {
  text-align: left;
}

.space-y-8 h3 {
  text-align: left;
}

.space-y-8 p {
  text-align: left;
}

/* 装饰光斑浮动动画 */
@keyframes floatSlow {

  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  33% {
    transform: translate(12px, -18px) scale(1.03);
  }

  66% {
    transform: translate(-8px, 10px) scale(0.98);
  }
}

@keyframes floatSlowReverse {

  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }

  33% {
    transform: translate(-15px, 12px) scale(1.02);
  }

  66% {
    transform: translate(10px, -14px) scale(0.97);
  }
}

@keyframes floatMedium {

  0%,
  100% {
    transform: translate(0, 0);
  }

  50% {
    transform: translate(20px, -25px);
  }
}

.animate-float-slow {
  animation: floatSlow 12s ease-in-out infinite;
}

.animate-float-slow-reverse {
  animation: floatSlowReverse 15s ease-in-out infinite;
}

.animate-float-medium {
  animation: floatMedium 10s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .login-aurora,
  .login-flow-line,
  .login-drift-grid,
  .login-brand-title,
  .login-brand-subtitle,
  .login-feature,
  .login-metrics,
  .login-card,
  .login-logo,
  .login-card::after {
    animation: none !important;
    opacity: 1;
  }

  .login-feature,
  .login-card :deep(.el-input__wrapper),
  .login-card :deep(.el-button--primary:not(.is-link)) {
    transition: none !important;
  }
}
</style>
