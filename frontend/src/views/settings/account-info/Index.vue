<template>
  <MainLayout>
    <div class="app-page account-info-page">
      <div class="account-info-layout grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 左侧主内-->
        <div class="lg:col-span-2">
          <div class="account-info-card bg-white rounded-xl shadow-sm p-8">
            <!-- 账号与密码-->
            <div class="mb-6">
              <h2 class="text-[22px] font-bold text-slate-900 text-left leading-tight">
                账号与密码</h2>
              <p class="text-[13px] text-slate-500 text-left mt-1">
                账号设置 / 个人信息
              </p>
            </div>
            <!-- 头像 -->
            <div class="border-b border-slate-200 py-3">
              <div class="flex justify-between items-center">
                <div class="flex items-center">
                  <div
                    class="w-12 h-12 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center mr-3">
                    <img v-if="authStore.user && authStore.user.avatar" :src="getUserAvatarUrl() || ''"
                      class="w-full h-full object-cover" alt="头像" />
                    <svg v-else class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z">
                      </path>
                    </svg>
                  </div>
                </div>
                <button @click="showAvatarEditor = true" class="text-blue-600 hover:text-blue-800 text-[13px]">
                  编辑
                </button>
              </div>
            </div>
            <!-- 昵称 -->
            <div class="border-b border-slate-200 py-3">
              <div class="flex justify-between items-center">
                <div class="text-left">
                  <p class="text-[15px] font-medium text-slate-800">
                    昵称
                  </p>
                  <p class="text-[13px] text-slate-500 mt-1">
                    {{ authStore.user?.nickname || '-' }}
                  </p>
                </div>
                <button @click="openEditModal('nickname')" class="text-blue-600 hover:text-blue-800 text-[13px]">
                  编辑
                </button>
              </div>
            </div>
            <!-- 用户名-->
            <div class="border-b border-slate-200 py-3">
              <div class="flex justify-between items-center">
                <div class="text-left">
                  <p class="text-[15px] font-medium text-slate-800">
                    用户名</p>
                  <p class="text-[13px] text-slate-500 mt-1">
                    {{ authStore.user?.username || '-' }}
                  </p>
                </div>
                <button disabled class="text-slate-400 text-[13px] cursor-not-allowed">
                  编辑
                </button>
              </div>
            </div>
            <!-- 密码 -->
            <div class="border-b border-slate-200 py-3">
              <div class="flex justify-between items-center">
                <div class="text-left">
                  <p class="text-[15px] font-medium text-slate-800">
                    密码
                  </p>
                  <p class="text-[13px] text-slate-500 mt-1">
                    已设置</p>
                </div>
                <button @click="openEditModal('password')" class="text-blue-600 hover:text-blue-800 text-[13px]">
                  编辑
                </button>
              </div>
            </div>
            <!-- 绑定手机 -->
            <div class="border-b border-slate-200 py-3">
              <div class="flex justify-between items-center">
                <div class="text-left">
                  <p class="text-[15px] font-medium text-slate-800">
                    绑定手机
                  </p>
                  <p class="text-[13px] text-slate-500 mt-1">
                    {{ formatPhone(authStore.user?.phone) }}
                  </p>
                </div>
                <button @click="authStore.user?.phone ? openEditModal('unbindPhone') : openEditModal('phone')"
                  :class="authStore.user?.phone ? 'text-red-600 hover:text-red-800' : 'text-blue-600 hover:text-blue-800'"
                  class="text-[13px]">
                  {{ authStore.user?.phone ? '解绑' : '绑定' }}
                </button>
              </div>
            </div>
            <!-- 绑定第三方账号-->
            <div class="py-4">
              <p class="text-[15px] font-medium text-slate-800 mb-4 text-left">
                绑定第三方账号</p>
              <div class="flex items-center gap-8">
                <!-- 微信 -->
                <div class="flex items-center">
                  <img :src="platformIconUrls.wechat" alt="微信" class="w-8 h-8 rounded-full mr-3" />
                  <div class="text-left">
                    <template v-if="authStore.user?.wechatOpenid">
                      <p class="text-sm text-green-600">
                        {{ authStore.user.wechatNickname || '微信用户' }}
                      </p>
                      <button @click="unbindWechat" class="text-[13px] text-blue-600 hover:text-blue-800">
                        解绑
                      </button>
                    </template>
                    <template v-else>
                      <button @click="bindWechat" class="text-[13px] text-blue-600 hover:text-blue-600">绑定微信</button>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 右侧：常见问题-->
        <div class="lg:col-span-1">
          <div class="account-info-card account-faq-card bg-white rounded-xl shadow-sm p-8">
            <h3 class="font-semibold text-slate-800 mb-4 text-left">常见问题</h3>
            <div class="mb-4">
              <ul class="space-y-2 text-sm">
                <li class="text-left">
                  <a href="#" @click.prevent="showFAQ(1)" class="text-slate-600 hover:text-blue-600">1. 为什么要进行二次验证</a>
                </li>
                <li class="text-left">
                  <a href="#" @click.prevent="showFAQ(2)" class="text-slate-600 hover:text-blue-600">2. 二次验证的手邮箱不可用？</a>
                </li>
                <li class="text-left">
                  <a href="#" @click.prevent="showFAQ(3)" class="text-slate-600 hover:text-blue-600">3. 忘记密码怎么办？</a>
                </li>
                <li class="text-left">
                  <a href="#" @click.prevent="showFAQ(4)" class="text-slate-600 hover:text-blue-600">4.
                    手机丢失，手机号不可用怎么办？</a>
                </li>
                <li class="text-left">
                  <a href="#" @click.prevent="showFAQ(5)" class="text-slate-600 hover:text-blue-600">5.
                    同一个手机号可以绑定多个账号吗？</a>
                </li>
              </ul>
            </div>
            <div class="pt-4 mt-4 border-t border-slate-100">
              <h3 class="font-semibold text-slate-800 mb-4 text-left">其他问题</h3>
              <ul class="space-y-2 text-sm">
                <li class="text-left">
                  <a href="#" @click.prevent="showFAQ(6)" class="text-slate-600 hover:text-blue-600">1. 网站出现了问题？<span
                      class="text-blue-600">问题反馈</span>
                  </a>
                </li>
                <li class="text-left">
                  <a href="#" @click.prevent="showFAQ(7)" class="text-slate-600 hover:text-blue-600">2. 账号如何注销<span
                      class="text-blue-600">账号注销</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 头像编辑-->
    <AvatarEditor v-model="showAvatarEditor" />
    <!-- 常见问题弹窗 -->
    <div v-if="showFAQModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl max-w-xl w-full mx-4 p-8">
        <div class="app-surface-header mb-8">
          <div class="app-surface-icon">
            <img :src="faqIconUrls.header" class="w-7 h-7" alt="常见问题" />
          </div>
          <div class="app-surface-title-wrapper">
            <h3 class="app-surface-title">常见问题</h3>
            <p class="app-surface-subtitle">账号安全相关说明</p>
          </div>
        </div>
        <div v-if="currentFAQ" class="space-y-5 text-left">
          <div class="flex items-start">
            <div class="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center mr-3 flex-shrink-0">
              <img :src="faqIconUrls.question" class="w-4 h-4" alt="问题" />
            </div>
            <div>
              <p class="text-xs font-medium text-blue-600 mb-1">问题</p>
              <h4 class="text-sm font-semibold text-slate-900 leading-relaxed">{{ currentFAQ.question }}</h4>
            </div>
          </div>
          <div class="flex items-start bg-slate-50 rounded-xl p-4">
            <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center mr-3 flex-shrink-0">
              <img :src="faqIconUrls.answer" class="w-4 h-4" alt="回答" />
            </div>
            <div>
              <p class="text-xs font-medium text-emerald-600 mb-1">回答</p>
              <p class="text-xs text-slate-600 leading-6">{{ currentFAQ.answer }}</p>
            </div>
          </div>
        </div>
        <div class="flex justify-end pt-8">
          <el-button type="primary" class="btn-confirm" @click="showFAQModal = false">关闭</el-button>
        </div>
      </div>
    </div>
    <!-- 通用编辑弹窗 -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-8">
        <div class="app-surface-header mb-8">
          <div class="app-surface-icon">
            <el-icon class="text-blue-600 text-2xl">
              <component :is="editModalIcon" />
            </el-icon>
          </div>
          <div class="app-surface-title-wrapper">
            <h3 class="app-surface-title">{{ getEditModalTitle() }}</h3>
            <p class="app-surface-subtitle">请填写账号信息</p>
          </div>
        </div>
        <form @submit.prevent="handleEditSubmit" class="px-4">
          <!-- 用户-->
          <div v-if="currentEditType === 'username'" class="form-item-wrapper">
            <div class="flex items-center gap-2 mb-2">
              <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">用户</label>
              <el-input v-model="editForm.username" placeholder="请输入用户名" size="default" clearable
                @blur="validateUsername" :class="validation.username.shaking ? 'animate-shake' : ''" class="flex-1">
                <template #prefix>
                  <el-icon>
                    <User />
                  </el-icon>
                </template>
              </el-input>
            </div>
            <div class="error-message-container ml-23">
              <p v-if="validation.username.touched && validation.username.message"
                :class="validation.username.valid ? 'text-xs text-green-600' : 'text-xs text-red-600'">
                {{ validation.username.message }}
              </p>
            </div>
          </div>
          <!-- 昵称 -->
          <div v-if="currentEditType === 'nickname'" class="form-item-wrapper">
            <div class="flex items-center gap-2 mb-2">
              <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">昵称</label>
              <el-input v-model="editForm.nickname" placeholder="请输入昵称" size="default" clearable
                @blur="validateNickname" :class="validation.nickname.shaking ? 'animate-shake' : ''" class="flex-1">
                <template #prefix>
                  <el-icon>
                    <User />
                  </el-icon>
                </template>
              </el-input>
            </div>
            <div class="error-message-container ml-23">
              <p v-if="validation.nickname.touched && validation.nickname.message"
                :class="validation.nickname.valid ? 'text-xs text-green-600' : 'text-xs text-red-600'">
                {{ validation.nickname.message }}
              </p>
            </div>
          </div>
          <!-- 手机-->
          <div v-if="currentEditType === 'phone' || currentEditType === 'unbindPhone'">
            <div class="form-item-wrapper">
              <div class="flex items-center gap-2 mb-2">
                <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">手机号</label>
                <el-input v-if="currentEditType === 'unbindPhone'" :value="formatPhone(editForm.phone)"
                  placeholder="请输入手机号" size="default" clearable :disabled="true" @blur="validatePhone"
                  :class="validation.phone.shaking ? 'animate-shake' : ''" class="flex-1">
                  <template #prefix>
                    <el-icon>
                      <Iphone />
                    </el-icon>
                  </template>
                </el-input>
                <el-input v-else v-model="editForm.phone" placeholder="请输入手机号" size="default" clearable
                  @blur="validatePhone" :class="validation.phone.shaking ? 'animate-shake' : ''" class="flex-1">
                  <template #prefix>
                    <el-icon>
                      <Iphone />
                    </el-icon>
                  </template>
                </el-input>
              </div>
              <div class="error-message-container ml-23">
                <p v-if="validation.phone.touched && validation.phone.message"
                  :class="validation.phone.valid ? 'text-xs text-green-600' : 'text-xs text-red-600'">
                  {{ validation.phone.message }}
                </p>
              </div>
            </div>
            <div class="form-item-wrapper">
              <div class="flex items-center gap-2 mb-2">
                <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">验证码</label>
                <el-input v-model="editForm.verificationCode" placeholder="请输入验证码" size="default" clearable
                  @blur="validateVerificationCode" :class="validation.verificationCode.shaking ? 'animate-shake' : ''"
                  class="flex-1">
                  <template #prefix>
                    <el-icon>
                      <Key />
                    </el-icon>
                  </template>
                  <template #append>
                    <el-button
                      :disabled="isSendingCode || (currentEditType === 'phone' ? phoneCodeCountdown : unbindPhoneCodeCountdown) > 0 || !editForm.phone"
                      @click="sendVerificationCode" size="small" class="code-btn">
                      {{ (currentEditType === 'phone' ? phoneCodeCountdown : unbindPhoneCodeCountdown) > 0 ?
                        ((currentEditType === 'phone' ? phoneCodeCountdown : unbindPhoneCodeCountdown) + 's后重发') : '获取验证码'
                      }}
                    </el-button>
                  </template>
                </el-input>
              </div>
              <div class="error-message-container ml-23">
                <p v-if="validation.verificationCode.touched && validation.verificationCode.message"
                  :class="validation.verificationCode.valid ? 'text-xs text-green-600' : 'text-xs text-red-600'">
                  {{ validation.verificationCode.message }}
                </p>
              </div>
            </div>
          </div>
          <!-- 密码 -->
          <div v-if="currentEditType === 'password'">
            <div class="form-item-wrapper">
              <div class="flex items-center gap-2 mb-2">
                <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">原密码</label>
                <el-input v-model="editForm.oldPassword" type="password" placeholder="请输入原密码" size="default"
                  show-password @blur="validateOldPassword"
                  :class="validation.oldPassword.shaking ? 'animate-shake' : ''" class="flex-1">
                  <template #prefix>
                    <el-icon>
                      <Lock />
                    </el-icon>
                  </template>
                </el-input>
              </div>
              <div class="error-message-container ml-23">
                <p v-if="validation.oldPassword.touched && validation.oldPassword.message"
                  :class="validation.oldPassword.valid ? 'text-xs text-green-600' : 'text-xs text-red-600'">
                  {{ validation.oldPassword.message }}
                </p>
              </div>
            </div>
            <div class="form-item-wrapper">
              <div class="flex items-center gap-2 mb-2">
                <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">新密码</label>
                <el-input v-model="editForm.newPassword" type="password" placeholder="请输入新密码" size="default"
                  show-password @blur="validateNewPassword"
                  :class="validation.newPassword.shaking ? 'animate-shake' : ''" class="flex-1">
                  <template #prefix>
                    <el-icon>
                      <Lock />
                    </el-icon>
                  </template>
                </el-input>
              </div>
              <div class="error-message-container ml-23">
                <p v-if="validation.newPassword.touched && validation.newPassword.message"
                  :class="validation.newPassword.valid ? 'text-xs text-green-600' : 'text-xs text-red-600'">
                  {{ validation.newPassword.message }}
                </p>
              </div>
            </div>
            <div class="form-item-wrapper">
              <div class="flex items-center gap-2 mb-2">
                <label class="text-xs font-medium text-gray-700 w-20 flex-shrink-0 text-left">确认新密</label>
                <el-input v-model="editForm.confirmPassword" type="password" placeholder="请再次输入新密码" size="default"
                  show-password @blur="validateConfirmPassword"
                  :class="validation.confirmPassword.shaking ? 'animate-shake' : ''" class="flex-1">
                  <template #prefix>
                    <el-icon>
                      <Lock />
                    </el-icon>
                  </template>
                </el-input>
              </div>
              <div class="error-message-container ml-23">
                <p v-if="validation.confirmPassword.touched && validation.confirmPassword.message"
                  :class="validation.confirmPassword.valid ? 'text-xs text-green-600' : 'text-xs text-red-600'">
                  {{ validation.confirmPassword.message }}
                </p>
              </div>
            </div>
          </div>
          <div class="button-group pt-4 flex gap-3">
            <el-button class="btn-cancel" :disabled="isSaving" @click="showEditModal = false">取消</el-button>
            <el-button type="primary" native-type="submit" class="btn-confirm" :loading="isSaving">{{ isSaving ? '保存..' : '提交' }}</el-button>
          </div>
        </form>
      </div>
    </div>
  </MainLayout>
</template>
<style scoped>
.account-info-page {
  display: flex;
}

.account-info-layout {
  width: 100%;
  min-height: var(--app-page-min-height);
  align-items: start;
}

.account-info-card {
  min-height: var(--app-page-min-height);
  box-sizing: border-box;
}

.account-faq-card {
  min-height: auto;
}

@keyframes shake {

  0%,
  100% {
    transform: translateX(0);
  }

  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-2px);
  }

  20%,
  40%,
  60%,
  80% {
    transform: translateX(2px);
  }
}

.animate-shake {
  animation: shake 0.6s ease-in-out;
}

/* 输入框聚焦动*/
:deep(.el-input__wrapper) {
  transition: all 0.2s ease;
}

/* 表单项间*/
.form-item-wrapper {
  margin-bottom: 8px;
}

/* 文字和文本框左对*/
.ml-23 {
  margin-left: 88px;
  /* w-20 (80px) + gap-2 (8px) = 88px */
}

/* 错误提示容器固定高度，防止弹窗增*/
.error-message-container {
  height: 14px;
  /* 固定高度，足够容纳一行文*/
  display: flex;
  align-items: center;
  padding-top: 2px;
}

/* 确保按钮右对*/
.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 获取验证码按钮字号 */
:deep(.code-btn) {
  font-size: 11px !important;
  padding: 0 8px !important;
}
</style>
<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue';
// 格式化手机号，隐藏中间四位
const formatPhone = (phone: string | null | undefined) => {
  if (!phone) return '未绑定';
  if (phone.length < 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};
import { useAuthStore } from '@/store/authStore';
import { ElMessage } from 'element-plus';
import { User, Lock, Iphone, Key, Cellphone } from '@element-plus/icons-vue';
import MainLayout from '@/components/MainLayout.vue';
// AppButton 已移除，使用全局CSS样式
import AvatarEditor from './components/AvatarEditor.vue';
import { getFullImageUrl } from '@/utils/common';
import { appAlert, appConfirm } from '@/utils/appConfirm';
import { faqIconUrls, platformIconUrls } from '@/utils/assetUrls';
const authStore = useAuthStore();
// 获取用户头像URL的辅助函数
const getUserAvatarUrl = () => {
  if (!authStore.user || !authStore.user.avatar) return null;
  return getFullImageUrl(authStore.user.avatar);
};
const showAvatarEditor = ref(false);
const showEditModal = ref(false);
const currentEditType = ref<string | null>(null);
const isSaving = ref(false);
const isSendingCode = ref(false);
// 分别为绑定手机和解绑手机设置独立的倒计时
const phoneCodeCountdown = ref(0);
const unbindPhoneCodeCountdown = ref(0);
let phoneCountdownTimer: ReturnType<typeof setInterval> | null = null;
let unbindPhoneCountdownTimer: ReturnType<typeof setInterval> | null = null;
const showFAQModal = ref(false);
const currentFAQ = ref<{ question: string; answer: string } | null>(null);
// 常见问题数据
const faqData = [
  {
    id: 1,
    question: '为什么要进行二次验证',
    answer: '为了您的账号安全，我们在敏感操作（如修改密码、绑定手机号等）时需要进行二次验证，防止账号被恶意攻击',
  },
  {
    id: 2,
    question: '二次验证的手邮箱不可用？',
    answer: '如果您的二次验证方式不可用，请联系客服进行人工核实身份，我们将帮助您解决问题',
  },
  {
    id: 3,
    question: '忘记密码怎么办？',
    answer: '您可以点击登录页面的"忘记密码"链接，通过手机号接收验证码来重置密码',
  },
  {
    id: 4,
    question: '手机丢失，手机号不可用怎么办？',
    answer: '请联系客服进行身份核实，我们将为您提供账号恢复服务。建议您在手机丢失后立即挂失手机号',
  },
  {
    id: 5,
    question: '同一个手机号可以绑定多个账号吗？',
    answer: '可以。绑定手机只校验手机号格式和短信验证码，不限制一个手机号只能绑定一个账号',
  },
  {
    id: 6,
    question: '网站出现了问题？',
    answer: '如果网站出现问题，请通过问题反馈功能联系我们的技术团队，我们会尽快处理',
  },
  {
    id: 7,
    question: '账号如何注销',
    answer: '账号注销需要您先解绑所有绑定的第三方账号，并清空账号内的所有数据。您可以在账号设置中找到注销选项',
  }
];
// 显示常见问题弹窗
const showFAQ = (id: number) => {
  const faq = faqData.find(item => item.id === id);
  if (faq) {
    currentFAQ.value = faq;
    showFAQModal.value = true;
  }
};
const editForm = ref({
  username: '',
  nickname: '',
  phone: '',
  verificationCode: '',
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const validation = ref({
  username: { valid: true, touched: false, message: '', shaking: false },
  nickname: { valid: true, touched: false, message: '', shaking: false },
  phone: { valid: true, touched: false, message: '', shaking: false },
  verificationCode: { valid: true, touched: false, message: '', shaking: false },
  oldPassword: { valid: true, touched: false, message: '', shaking: false },
  newPassword: { valid: true, touched: false, message: '', shaking: false },
  confirmPassword: { valid: true, touched: false, message: '', shaking: false },
});
const editModalIcon = computed(() => {
  if (currentEditType.value === 'password') {
    return Lock;
  }
  if (currentEditType.value === 'phone' || currentEditType.value === 'unbindPhone') {
    return Cellphone;
  }
  return User;
});
const getEditModalTitle = () => {
  const titles: Record<string, string> = {
    username: '编辑用户',
    nickname: '编辑昵称',
    phone: authStore.user?.phone ? '编辑手机' : '绑定手机',
    unbindPhone: '解绑手机',
    password: '修改密码',
  };
  return titles[currentEditType.value || ''] || '编辑';
};
const openEditModal = (type: string) => {
  currentEditType.value = type;
  editForm.value = {
    username: authStore.user?.username || '',
    nickname: authStore.user?.nickname || '',
    phone: authStore.user?.phone || '',
    verificationCode: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
  // 重置验证状态
  validation.value = {
    username: { valid: true, touched: false, message: '', shaking: false },
    nickname: { valid: true, touched: false, message: '', shaking: false },
    phone: { valid: true, touched: false, message: '', shaking: false },
    verificationCode: { valid: true, touched: false, message: '', shaking: false },
    oldPassword: { valid: true, touched: false, message: '', shaking: false },
    newPassword: { valid: true, touched: false, message: '', shaking: false },
    confirmPassword: { valid: true, touched: false, message: '', shaking: false },
  };
  showEditModal.value = true;
};
const triggerShake = (field: keyof typeof validation.value) => {
  validation.value[field].shaking = true;
  setTimeout(() => {
    validation.value[field].shaking = false;
  }, 400);
};
const validateUsername = () => {
  validation.value.username.touched = true;
  if (!editForm.value.username || editForm.value.username.trim() === '') {
    validation.value.username.valid = false;
    validation.value.username.message = '请输入用户名';
    triggerShake('username');
  } else if (editForm.value.username.length > 20) {
    validation.value.username.valid = false;
    validation.value.username.message = '用户名不能超过20个字符';
    triggerShake('username');
  } else {
    validation.value.username.valid = true;
    validation.value.username.message = '';
  }
};
const validateNickname = () => {
  validation.value.nickname.touched = true;
  if (!editForm.value.nickname || editForm.value.nickname.trim() === '') {
    validation.value.nickname.valid = false;
    validation.value.nickname.message = '请输入昵称';
    triggerShake('nickname');
  } else if (editForm.value.nickname.length > 20) {
    validation.value.nickname.valid = false;
    validation.value.nickname.message = '昵称不能超过20个字';
    triggerShake('nickname');
  } else {
    validation.value.nickname.valid = true;
    validation.value.nickname.message = '';
  }
};
const validatePhone = () => {
  validation.value.phone.touched = true;
  const phonePattern = /^1[3-9]\d{9}$/;
  if (!editForm.value.phone) {
    validation.value.phone.valid = false;
    validation.value.phone.message = '请输入手机号';
    triggerShake('phone');
  } else if (!phonePattern.test(editForm.value.phone)) {
    validation.value.phone.valid = false;
    validation.value.phone.message = '请输入正确格式的手机号';
    triggerShake('phone');
  } else {
    validation.value.phone.valid = true;
    validation.value.phone.message = '';
  }
};
const validateVerificationCode = () => {
  validation.value.verificationCode.touched = true;
  if (!editForm.value.verificationCode) {
    validation.value.verificationCode.valid = false;
    validation.value.verificationCode.message = '请输入验证码';
    triggerShake('verificationCode');
  } else if (editForm.value.verificationCode.length !== 6) {
    validation.value.verificationCode.valid = false;
    validation.value.verificationCode.message = '验证码为6位数字';
    triggerShake('verificationCode');
  } else {
    validation.value.verificationCode.valid = true;
    validation.value.verificationCode.message = '';
  }
};
const validateOldPassword = () => {
  validation.value.oldPassword.touched = true;
  if (!editForm.value.oldPassword) {
    validation.value.oldPassword.valid = false;
    validation.value.oldPassword.message = '请输入原密码';
    triggerShake('oldPassword');
  } else {
    validation.value.oldPassword.valid = true;
    validation.value.oldPassword.message = '';
  }
};
const validateNewPassword = () => {
  validation.value.newPassword.touched = true;
  if (!editForm.value.newPassword) {
    validation.value.newPassword.valid = false;
    validation.value.newPassword.message = '请输入新密码';
    triggerShake('newPassword');
  } else if (editForm.value.newPassword.length < 6) {
    validation.value.newPassword.valid = false;
    validation.value.newPassword.message = '密码至少需8位字符';
    triggerShake('newPassword');
  } else {
    validation.value.newPassword.valid = true;
    validation.value.newPassword.message = '';
  }
  // 同时验证确认密码
  if (validation.value.confirmPassword.touched) {
    validateConfirmPassword();
  }
};
const validateConfirmPassword = () => {
  validation.value.confirmPassword.touched = true;
  if (!editForm.value.confirmPassword) {
    validation.value.confirmPassword.valid = false;
    validation.value.confirmPassword.message = '请确认新密码';
    triggerShake('confirmPassword');
  } else if (editForm.value.confirmPassword !== editForm.value.newPassword) {
    validation.value.confirmPassword.valid = false;
    validation.value.confirmPassword.message = '两次输入的密码不一致';
    triggerShake('confirmPassword');
  } else {
    validation.value.confirmPassword.valid = true;
    validation.value.confirmPassword.message = '';
  }
};
const startPhoneCodeCountdown = (type: 'phone' | 'unbindPhone', seconds: number) => {
  const countdown = type === 'phone' ? phoneCodeCountdown : unbindPhoneCodeCountdown;
  const currentTimer = type === 'phone' ? phoneCountdownTimer : unbindPhoneCountdownTimer;
  if (currentTimer) {
    clearInterval(currentTimer);
  }

  countdown.value = Math.max(1, Math.ceil(seconds));
  const timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(timer);
      if (type === 'phone') {
        phoneCountdownTimer = null;
      } else {
        unbindPhoneCountdownTimer = null;
      }
    }
  }, 1000);

  if (type === 'phone') {
    phoneCountdownTimer = timer;
  } else {
    unbindPhoneCountdownTimer = timer;
  }
};
const sendVerificationCode = async () => {
  if (!editForm.value.phone) {
    ElMessage.warning('请先输入手机号');
    return;
  }
  validatePhone();
  if (!validation.value.phone.valid) {
    return;
  }
  isSendingCode.value = true;
  try {
    const smsScene = currentEditType.value === 'unbindPhone' ? 'unbind_phone' : 'bind_phone';
    const response = await authStore.sendVerificationCode(editForm.value.phone, smsScene);
    const countdownType = currentEditType.value === 'unbindPhone' ? 'unbindPhone' : 'phone';
    if (response?.success) {
      ElMessage.success(response.message || '验证码已发送');
      startPhoneCodeCountdown(countdownType, response.data?.cooldownSeconds || 60);
      return;
    }

    const remainingSeconds = response?.data?.remainingSeconds;
    if (remainingSeconds) {
      ElMessage.warning(response.message || `验证码已发送，请 ${remainingSeconds} 秒后再试`);
      startPhoneCodeCountdown(countdownType, remainingSeconds);
      return;
    }

    ElMessage.error(response?.message || authStore.error || '发送失败，请重试');
  } catch (error) {
    console.error('发送验证码失败:', error);
    ElMessage.error('发送失败，请重试');
  } finally {
    isSendingCode.value = false;
  }
};
const handleEditSubmit = async () => {
  // 先触发表单所有验证
  if (currentEditType.value === 'username') {
    validateUsername();
    if (!validation.value.username.valid) {
      return;
    }
  } else if (currentEditType.value === 'nickname') {
    validateNickname();
    if (!validation.value.nickname.valid) {
      return;
    }
  } else if (currentEditType.value === 'phone' || currentEditType.value === 'unbindPhone') {
    validatePhone();
    validateVerificationCode();
    if (!validation.value.phone.valid || !validation.value.verificationCode.valid) {
      return;
    }
  } else if (currentEditType.value === 'password') {
    validateOldPassword();
    validateNewPassword();
    validateConfirmPassword();
    if (!validation.value.oldPassword.valid || !validation.value.newPassword.valid || !validation.value.confirmPassword.valid) {
      return;
    }
  }
  isSaving.value = true;
  try {
    if (currentEditType.value === 'username') {
      await authStore.updateProfile({ username: editForm.value.username });
      ElMessage.success('用户名更新成功');
    } else if (currentEditType.value === 'nickname') {
      await authStore.updateProfile({ nickname: editForm.value.nickname });
      ElMessage.success('昵称更新成功');
    } else if (currentEditType.value === 'phone') {
      if (!editForm.value.verificationCode) {
        ElMessage.warning('请输入验证码');
        return;
      }
      await authStore.bindPhone(editForm.value.phone, editForm.value.verificationCode);
      ElMessage.success('手机绑定成功');
      // 绑定成功后清除绑定手机的倒计时
      if (phoneCountdownTimer) {
        clearInterval(phoneCountdownTimer);
        phoneCountdownTimer = null;
      }
      phoneCodeCountdown.value = 0;
    } else if (currentEditType.value === 'unbindPhone') {
      if (!editForm.value.verificationCode) {
        ElMessage.warning('请输入验证码');
        return;
      }
      await authStore.unbindPhone(editForm.value.phone, editForm.value.verificationCode);
      ElMessage.success('手机解绑成功');
      // 解绑成功后清除解绑手机的倒计时
      if (unbindPhoneCountdownTimer) {
        clearInterval(unbindPhoneCountdownTimer);
        unbindPhoneCountdownTimer = null;
      }
      unbindPhoneCodeCountdown.value = 0;
    } else if (currentEditType.value === 'password') {
      if (editForm.value.newPassword !== editForm.value.confirmPassword) {
        ElMessage.warning('两次输入的密码不一致');
        return;
      }
      if (editForm.value.newPassword.length < 6) {
        ElMessage.warning('密码至少需8位字符');
        return;
      }
      if (!editForm.value.oldPassword) {
        ElMessage.warning('请输入原密码');
        return;
      }
      const success = await authStore.changePassword(editForm.value.oldPassword, editForm.value.newPassword);
      if (success) {
        ElMessage.success('密码修改成功');
      }
    }
    showEditModal.value = false;
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败，请重试');
  } finally {
    isSaving.value = false;
  }
};
const unbindWechat = async () => {
  try {
    await appConfirm({
      title: '解绑微信',
      message: '确定要解绑当前微信账号吗？解绑后将无法通过该微信快速登录。',
      confirmText: '确定解绑',
      cancelText: '取消',
      variant: 'warning',
      icon: 'warning',
    });
    await authStore.unbindWechat();
    ElMessage.success('微信解绑成功');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('解绑失败，请重试');
    }
  }
};

const bindWechat = async () => {
  await appAlert({
    title: '绑定微信',
    message: '当前版本暂未开放账号内绑定微信，请先使用微信扫码登录完成微信账号关联。',
    confirmText: '知道了',
    variant: 'warning',
    icon: 'warning',
  });
};

onUnmounted(() => {
  if (phoneCountdownTimer) {
    clearInterval(phoneCountdownTimer);
    phoneCountdownTimer = null;
  }
  if (unbindPhoneCountdownTimer) {
    clearInterval(unbindPhoneCountdownTimer);
    unbindPhoneCountdownTimer = null;
  }
});
</script>
