<template>
  <MainLayout>
    <div class="app-page api-config-page">
      <div class="api-config-page-panel">
        <div class="app-page-card api-config-page-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div class="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
            <h3 class="text-lg font-bold text-slate-900 text-left">
              API配置
            </h3>
            <p class="text-xs text-slate-500 text-left mt-1">
              管理第三方平台接口凭证与连接状态
            </p>
          </div>
          <!-- Tab标签 -->
          <el-tabs v-model="activeTab" class="config-tabs">
            <!-- 微信登录 -->
            <el-tab-pane name="wechat-login">
              <template #label>
                <div class="flex items-center gap-2">
                  <img :src="platformIconUrls.wechat" alt="微信" class="w-4 h-4">
                  <span>微信登录</span>
                </div>
              </template>
              <ApiConfigPanel
                platform="wechat-login"
                :description="platformConfigs['wechat-login'].description"
                :fields="platformConfigs['wechat-login'].fields"
                :configData="configs['wechat-login'] || {}"
                :editData="editForm"
                :isEditing="editingPlatform === 'wechat-login'"
                :isSaving="isSaving"
                :isTesting="testingConnection === 'wechat-login'"
                @update:edit-data="handleEditFormUpdate"
                @edit="handleEdit"
                @save="handleSave"
                @cancel="handleCancel"
                @test="testConnection"
              />
            </el-tab-pane>
            <!-- 微信支付 -->
            <el-tab-pane name="wechat-pay">
              <template #label>
                <div class="flex items-center gap-2">
                  <img :src="platformIconUrls.wechatPay" alt="微信支付" class="w-4 h-4">
                  <span>微信支付</span>
                </div>
              </template>
              <ApiConfigPanel
                platform="wechat-pay"
                :description="platformConfigs['wechat-pay'].description"
                :fields="platformConfigs['wechat-pay'].fields"
                :configData="configs['wechat-pay'] || {}"
                :editData="editForm"
                :isEditing="editingPlatform === 'wechat-pay'"
                :isSaving="isSaving"
                :isTesting="testingConnection === 'wechat-pay'"
                @update:edit-data="handleEditFormUpdate"
                @edit="handleEdit"
                @save="handleSave"
                @cancel="handleCancel"
                @test="testConnection"
              />
            </el-tab-pane>
            <!-- 短信认证 -->
            <el-tab-pane name="sms">
              <template #label>
                <div class="flex items-center gap-2">
                  <img :src="platformIconUrls.sms" alt="短信" class="w-4 h-4">
                  <span>短信认证</span>
                </div>
              </template>
              <ApiConfigPanel
                platform="sms"
                :description="platformConfigs['sms'].description"
                :fields="platformConfigs['sms'].fields"
                :configData="configs['sms'] || {}"
                :editData="editForm"
                :isEditing="editingPlatform === 'sms'"
                :isSaving="isSaving"
                :isTesting="testingConnection === 'sms'"
                @update:edit-data="handleEditFormUpdate"
                @edit="handleEdit"
                @save="handleSave"
                @cancel="handleCancel"
                @test="testConnection"
              />
            </el-tab-pane>
            <!-- 中俄翻译 -->
            <el-tab-pane name="translation">
              <template #label>
                <div class="flex items-center gap-2">
                  <img :src="platformIconUrls.translation" alt="中俄翻译" class="w-4 h-4">
                  <span>中俄翻译</span>
                </div>
              </template>
              <ApiConfigPanel
                platform="translation"
                :description="platformConfigs['translation'].description"
                :fields="platformConfigs['translation'].fields"
                :configData="configs['translation'] || {}"
                :editData="editForm"
                :isEditing="editingPlatform === 'translation'"
                :isSaving="isSaving"
                :isTesting="testingConnection === 'translation'"
                @update:edit-data="handleEditFormUpdate"
                @edit="handleEdit"
                @save="handleSave"
                @cancel="handleCancel"
                @test="testConnection"
              />
            </el-tab-pane>
            <!-- 1688平台 -->
            <el-tab-pane name="1688">
              <template #label>
                <div class="flex items-center gap-2">
                  <img :src="platformIconUrls.alibaba" alt="1688" class="w-4 h-4">
                  <span>1688平台</span>
                </div>
              </template>
              <div class="api-config-tab-panel px-8 py-6">
                <div class="mb-5 px-4 py-3 bg-blue-50 rounded-lg">
                  <p class="text-xs text-blue-700 leading-5 text-left">
                    <strong>配置说明：</strong>1688平台授权配置，用于获取商品详情、库存等信息，请使用阿里千川开放平台申请API应用
                  </p>
                </div>
                <div class="alibaba-auth-card mb-6 mx-auto max-w-[95%] rounded-2xl overflow-hidden shadow-sm border" :class="alibabaAuthStatus.hasToken && !alibabaAuthStatus.isExpired ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200/60' : 'bg-gradient-to-r from-slate-50 to-blue-50/30 border-slate-200/60'">
                  <div class="flex items-center justify-between gap-6 px-8 py-5">
                    <!-- 左侧图标 -->
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                      :class="alibabaAuthStatus.hasToken && !alibabaAuthStatus.isExpired ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white' : 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white'">
                      <!-- 已授权：盾牌+勾 -->
                      <svg v-if="alibabaAuthStatus.hasToken && !alibabaAuthStatus.isExpired" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4">
                        <path fill-rule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08Zm3.094 8.016a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" />
                      </svg>
                      <!-- 未授权/已过期：盾牌+感叹号 -->
                      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-4">
                        <path fill-rule="evenodd" d="M11.484 2.17a.75.75 0 0 1 1.032 0 11.209 11.209 0 0 0 7.877 3.08.75.75 0 0 1 .722.515 12.74 12.74 0 0 1 .635 3.985c0 5.942-4.064 10.933-9.563 12.348a.749.749 0 0 1-.374 0C6.314 20.683 2.25 15.692 2.25 9.75c0-1.39.223-2.73.635-3.985a.75.75 0 0 1 .722-.516l.143.001c2.996 0 5.718-1.17 7.734-3.08ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75ZM12 15a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75v-.008a.75.75 0 0 0-.75-.75H12Z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <!-- 中间信息 -->
                    <div class="flex-1 text-left space-y-1">
                      <div class="text-[13px] leading-5 font-semibold text-slate-700">
                        获取时间：<span class="font-normal text-slate-500">{{ alibabaAuthStatus.hasToken ? (alibabaAuthStatus.obtainedAt ? formatDate(new Date(alibabaAuthStatus.obtainedAt)) : '-') : '-' }}</span>
                      </div>
                      <div class="text-xs leading-4">
                        <span class="text-slate-500">有效期：</span>
                        <!-- 状态1：未获取（灰色） -->
                        <span
                          v-if="!alibabaAuthStatus.hasToken"
                          class="inline-flex items-center px-1.5 py-px rounded-full text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200"
                        >未获取</span>
                        <!-- 状态2：已过期（红色） -->
                        <span
                          v-else-if="alibabaAuthStatus.isExpired"
                          class="inline-flex items-center px-1.5 py-px rounded-full text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200"
                        >已过期</span>
                        <!-- 状态3：已授权（绿色倒计时） -->
                        <span
                          v-else
                          class="inline-flex items-center px-1.5 py-px rounded-full text-[10px] font-semibold text-emerald-700 bg-emerald-100/80"
                        >{{ formatSeconds(alibabaAuthStatus.remainingSeconds) }}</span>
                      </div>
                    </div>
                    <!-- 右侧按钮（更小） -->
                    <button
                      @click="handle1688Auth"
                      :disabled="isSaving"
                      :class="[
                        'px-3 py-1.5 rounded-lg text-[12px] transition-all duration-200 flex items-center gap-1.5 flex-shrink-0 font-medium shadow-sm',
                        alibabaAuthStatus.hasToken && !alibabaAuthStatus.isExpired
                          ? 'text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-200/50'
                          : 'text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-blue-200/50',
                        isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.97]'
                      ]"
                    >
                      <svg v-if="alibabaAuthStatus.hasToken && !alibabaAuthStatus.isExpired" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                        <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
                      </svg>
                      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                      </svg>
                      {{ alibabaAuthStatus.hasToken ? '重新授权' : '获取授权' }}
                    </button>
                  </div>
                </div>
                <div class="alibaba-config-form">
                  <div class="api-config-field">
                    <span class="api-config-label">回调地址</span>
                    <div class="api-config-control">
                      <el-input
                        :model-value="getAlibabaFieldValue('redirectUri')"
                        placeholder="请输入回调地址"
                        size="small"
                        class="api-config-input"
                        :readonly="editingPlatform !== '1688'"
                        @update:model-value="value => handleAlibabaFieldUpdate('redirectUri', value)"
                      >
                        <template #prefix>
                          <el-icon>
                            <Link />
                          </el-icon>
                        </template>
                      </el-input>
                    </div>
                  </div>
                  <div class="api-config-field">
                    <span class="api-config-label">App Key</span>
                    <div class="api-config-control">
                      <el-input
                        :model-value="getAlibabaFieldValue('appKey')"
                        placeholder="请输入App Key"
                        size="small"
                        class="api-config-input"
                        :readonly="editingPlatform !== '1688'"
                        @update:model-value="value => handleAlibabaFieldUpdate('appKey', value)"
                      >
                        <template #prefix>
                          <el-icon>
                            <Key />
                          </el-icon>
                        </template>
                      </el-input>
                    </div>
                  </div>
                  <div class="api-config-field">
                    <span class="api-config-label">App Secret</span>
                    <div class="api-config-control">
                      <el-input
                        :model-value="getAlibabaFieldValue('appSecret')"
                        :type="editingPlatform === '1688' ? 'password' : 'text'"
                        placeholder="请输入App Secret"
                        size="small"
                        class="api-config-input"
                        :readonly="editingPlatform !== '1688'"
                        :show-password="editingPlatform === '1688'"
                        @update:model-value="value => handleAlibabaFieldUpdate('appSecret', value)"
                      >
                        <template #prefix>
                          <el-icon>
                            <Lock />
                          </el-icon>
                        </template>
                      </el-input>
                    </div>
                  </div>
                  <div class="api-config-actions">
                    <template v-if="editingPlatform === '1688'">
                      <button @click="handleSave('1688')" :disabled="isSaving" :class="[
                        'api-config-button api-config-button--primary',
                        isSaving ? 'is-disabled' : ''
                      ]">
                        {{ isSaving ? '保存..' : '保存' }}
                      </button>
                      <button @click="handleCancel"
                        class="api-config-button api-config-button--secondary">
                        取消
                      </button>
                    </template>
                    <template v-else>
                      <button @click="handleEdit('1688')"
                        class="api-config-button api-config-button--primary">
                        配置
                      </button>
                    </template>
                  </div>
                </div>
              </div>
            </el-tab-pane>
            <!-- Ozon平台 -->
            <el-tab-pane name="ozon">
              <template #label>
                <div class="flex items-center gap-2">
                  <img :src="platformIconUrls.ozon" alt="Ozon" class="w-4 h-4">
                  <span>Ozon平台</span>
                </div>
              </template>
              <div class="api-config-tab-panel px-8 py-6">
                <div class="mb-5 px-4 py-3 bg-blue-50 rounded-lg">
                  <p class="text-xs text-blue-700 leading-5 text-left">
                    <strong>配置说明：</strong>管理 Ozon 店铺 Cookie 及基础功能设置，包括商品中文显示、人民币价格转换、类目数据同步等核心功能
                  </p>
                </div>
                <div class="ozon-config-wrap mx-auto max-w-5xl">
                  <div class="ozon-config-card bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="ozon-config-header px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-white to-emerald-50/60">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                          <div class="ozon-config-icon w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <svg class="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div class="text-left">
                            <h3 class="text-base font-bold text-slate-900">Ozon配置</h3>
                            <p class="text-xs text-slate-500 mt-1">Cookie管理、类目数据同步及搜索缓存设置</p>
                          </div>
                        </div>
                        <div class="flex items-center gap-3">
                          <!-- 设置按钮（图标形式） -->
                          <button
                            @click="openOzonSettings"
                            class="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors inline-flex items-center justify-center"
                            title="搜索与缓存设置"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          <!-- 类目更新按钮（使用AppUpdateButton组件） -->
                          <AppUpdateButton text="类目更新" :loading="isSyncingCategories" :last-update-time="lastUpdateTime"
                            :update-status="updateStatus === '更新成功' ? 'success' : updateStatus === '更新失败' ? 'error' : 'idle'"
                            :fetch-last-update-time="fetchLastUpdateTime" :module="OZON_PREFERENCE_MODULE" @click="handleUpdateClick"
                            @detail="handleDetailClick" />
                        </div>
                      </div>
                    </div>
                    <!-- Cookie 状态区 -->
                    <div class="ozon-config-body px-10 py-8">
                      <!-- Cookie 信息展示（四栏网格） -->
                      <div class="ozon-stats-block mb-6">
                        <div class="grid grid-cols-4 gap-3">
                          <div class="ozon-status-card bg-gradient-to-br from-slate-50 to-white rounded-xl px-4 py-4 border border-slate-100 hover:shadow-sm transition-shadow">
                            <div class="text-[11px] text-slate-400 mb-1.5 font-medium uppercase tracking-wide">状态</div>
                            <div v-if="isLoadingOzonConfig" class="text-sm font-medium text-slate-400">加载中...</div>
                            <div v-else class="inline-flex items-center gap-1.5 text-sm font-semibold"
                              :class="ozonConfig?.cookieStatus?.valid ? 'text-emerald-600' : ozonConfig?.cookieStatus ? 'text-red-500' : 'text-slate-500'">
                              <div class="w-4 h-4 rounded-full flex items-center justify-center"
                                :class="ozonConfig?.cookieStatus?.valid ? 'bg-emerald-100' : ozonConfig?.cookieStatus ? 'bg-red-100' : 'bg-slate-100'">
                                <svg v-if="ozonConfig?.cookieStatus?.valid" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                                <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </div>
                              <span>{{ ozonConfig?.cookieStatus ? (ozonConfig.cookieStatus.valid ? '已配置' : '可能失效') : '未配置' }}</span>
                            </div>
                          </div>
                          <div class="ozon-status-card bg-gradient-to-br from-slate-50 to-white rounded-xl px-4 py-4 border border-slate-100 hover:shadow-sm transition-shadow">
                            <div class="text-[11px] text-slate-400 mb-1.5 font-medium uppercase tracking-wide">获取时间</div>
                            <div class="text-sm font-medium text-slate-700">{{ isLoadingOzonConfig ? '加载中...' : (ozonConfig?.cookieStatus?.exported_at ? formatDate(new Date(ozonConfig.cookieStatus.exported_at)) : '-') }}</div>
                          </div>
                          <div class="ozon-status-card bg-gradient-to-br from-slate-50 to-white rounded-xl px-4 py-4 border border-slate-100 hover:shadow-sm transition-shadow">
                            <div class="text-[11px] text-slate-400 mb-1.5 font-medium uppercase tracking-wide">语言设置</div>
                            <div class="text-sm font-medium text-slate-700">{{ isLoadingOzonConfig ? '加载中...' : (ozonConfig?.cookieStatus?.lang || '-') }}</div>
                          </div>
                          <div class="ozon-status-card bg-gradient-to-br from-slate-50 to-white rounded-xl px-4 py-4 border border-slate-100 hover:shadow-sm transition-shadow">
                            <div class="text-[11px] text-slate-400 mb-1.5 font-medium uppercase tracking-wide">货币设置</div>
                            <div class="text-sm font-medium text-slate-700">{{ isLoadingOzonConfig ? '加载中...' : (ozonConfig?.cookieStatus?.currency || '-') }}</div>
                          </div>
                        </div>
                      </div>
                      <div class="ozon-worker-card mt-6 rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
                        <div class="flex items-center justify-between gap-4">
                          <div class="flex items-center gap-3 text-left">
                            <div class="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                              <Connection class="w-4 h-4" />
                            </div>
                            <div>
                              <div class="text-sm font-semibold text-slate-800">本机采集器</div>
                              <div class="text-xs text-slate-500 mt-0.5">
                                用本机 Chrome 执行 Ozon 前台搜索、链接解析和类型提取
                              </div>
                            </div>
                          </div>
                          <div class="flex items-center gap-2">
                            <button
                              class="api-config-button api-config-button--secondary"
                              :disabled="isLoadingWorkers"
                              @click="loadOzonWorkers"
                            >
                              刷新状态
                            </button>
                            <button
                              class="api-config-button api-config-button--primary"
                              :disabled="isCreatingWorker"
                              @click="createOzonWorker"
                            >
                              {{ isCreatingWorker ? '生成中...' : '生成令牌' }}
                            </button>
                          </div>
                        </div>
                        <div class="mt-4 grid grid-cols-1 gap-2">
                          <div v-if="isLoadingWorkers" class="text-xs text-slate-400 text-left">正在获取采集器状态...</div>
                          <div v-else-if="ozonWorkers.length === 0" class="text-xs text-slate-500 text-left">
                            暂无采集器，生成令牌后在本机运行 worker 即可上线。
                          </div>
                          <div
                            v-for="worker in ozonWorkers"
                            :key="worker.id"
                            class="flex items-center justify-between rounded-lg border border-white bg-white px-3 py-2 text-xs"
                          >
                            <div class="flex items-center gap-2 min-w-0">
                              <span
                                class="w-2 h-2 rounded-full"
                                :class="worker.status === 'online' ? 'bg-emerald-500' : worker.status === 'disabled' ? 'bg-slate-400' : 'bg-amber-400'"
                              ></span>
                              <span class="font-medium text-slate-700 truncate">{{ worker.name }}</span>
                            </div>
                            <div class="text-slate-500">
                              {{ worker.status === 'online' ? '在线' : worker.status === 'disabled' ? '已禁用' : '离线' }}
                              <span v-if="worker.lastSeenAt"> · {{ formatDate(new Date(worker.lastSeenAt)) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <!-- 提示 + 按钮 -->
                      <div class="ozon-action-area text-center py-4">
                        <p class="text-xs text-slate-500 mb-4">
                          {{ isLoadingOzonConfig
                            ? '正在获取 Cookie 配置状态'
                            : ozonConfig?.cookieStatus
                            ? '设置中文语言和人民币货币，使Ozon优选获取的商品信息正确显示'
                            : '尚未配置 Cookie，请先获取或导入' }}
                        </p>
                        <div class="flex flex-row gap-2.5 justify-center">
                          <button @click="fetchOzonCookie" :disabled="isFetchingCookie"
                            :class="[
                              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 shadow-sm',
                              'text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-200/50',
                              isFetchingCookie ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.97]'
                            ]">
                            <svg v-if="isFetchingCookie" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{{ isFetchingCookie ? '获取中...' : (ozonConfig?.cookieStatus ? '重新获取' : '一键获取') }}</span>
                          </button>
                          <button @click="triggerCookieFileImport" :disabled="isImportingCookie"
                            :class="[
                              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5',
                              'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
                              isImportingCookie ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.97]'
                            ]">
                            <svg v-if="isImportingCookie" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{{ isImportingCookie ? '导入..' : (ozonConfig?.cookieStatus ? '手动导入' : '手动导入') }}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>
    <!-- Cookie详情弹窗 -->
    <el-dialog v-model="showCookieDetailModal" title="Cookie详情" width="500px" :show-close="false">
      <div v-if="ozonCookieData" class="space-y-4">
        <div class="flex items-center justify-between py-2 border-b border-gray-100">
          <span class="text-xs text-gray-500">获取时间</span>
          <span class="text-xs text-gray-700">{{ ozonCookieData.exported_at ? formatDate(new Date(ozonCookieData.exported_at)) : '-' }}</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-gray-100">
          <span class="text-xs text-gray-500">语言设置</span>
          <span class="text-xs text-gray-700">{{ ozonCookieData.lang || '-' }}</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-gray-100">
          <span class="text-xs text-gray-500">货币设置</span>
          <span class="text-xs text-gray-700">{{ ozonCookieData.currency || '-' }}</span>
        </div>
      </div>
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end">
        <el-button class="btn-cancel" @click="showCookieDetailModal = false">关闭</el-button>
      </div>
    </el-dialog>
    <AppDialog
      v-model="showOzonSettingsModal"
      title="Ozon优选设置"
      subtitle="配置搜索数量、缓存时长与缓存清理"
      :icon="Connection"
      confirm-text="保存"
      confirm-loading-text="保存中..."
      :confirm-loading="isSavingPreference"
      @confirm="savePreferenceConfig"
    >
      <div class="ozon-preference-dialog space-y-4">
        <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium text-gray-700 text-left mb-1">一次搜索商品数量</div>
            <el-slider v-model="preferenceForm.searchLimit" :min="10" :max="200" :step="10" :show-tooltip="false" />
          </div>
          <span class="text-xs text-gray-600 w-12 text-right flex-shrink-0">{{ preferenceForm.searchLimit }} 条</span>
        </div>

        <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div class="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium text-gray-700 text-left mb-1">搜索结果缓存时长</div>
            <el-slider v-model="preferenceForm.cacheMaxAge" :min="1" :max="24" :step="1" :show-tooltip="false" />
          </div>
          <span class="text-xs text-gray-600 w-14 text-right flex-shrink-0">{{ preferenceForm.cacheMaxAge }} 小时</span>
        </div>

        <div class="flex items-center justify-between py-1">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <div class="text-sm font-medium text-gray-800">清除搜索缓存</div>
              <div class="text-xs text-gray-400">
                当前缓存：{{ cacheInfo.formattedSize }}（{{ cacheInfo.fileCount }} 个文件）
              </div>
            </div>
          </div>
          <button @click="handleClearCache" :disabled="isClearingCache || cacheInfo.fileCount === 0"
            class="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1">
            <svg v-if="isClearingCache" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ isClearingCache ? '清除中...' : '清除缓存' }}</span>
          </button>
        </div>
      </div>
    </AppDialog>
    <AppDialog
      v-model="showWorkerTokenDialog"
      title="本机采集器令牌"
      subtitle="令牌只显示一次，请保存到本机 worker 配置文件"
      :icon="Key"
      confirm-text="我已保存"
      @confirm="showWorkerTokenDialog = false"
    >
      <div class="space-y-4">
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 text-left">
          这个令牌可以领取你的 Ozon 前台采集任务，不会再次展示。不要发给其他人。
        </div>
        <div>
          <div class="text-xs font-semibold text-slate-600 text-left mb-2">worker.config.json</div>
          <pre class="worker-token-code">{{ workerConfigSnippet }}</pre>
        </div>
        <button class="api-config-button api-config-button--secondary w-full justify-center" @click="copyWorkerConfig">
          复制配置
        </button>
      </div>
    </AppDialog>
    <!-- 文件上传隐藏input -->
    <input ref="cookieFileInput" type="file" accept=".json" class="hidden" @change="handleCookieFileSelect" />
  </MainLayout>

  <!-- 类目更新日志弹窗 -->
  <AppDetailDialog v-model="showDetailDialog" title="类目更新记录" :type="detailType" :show-store="false" :data="logList"
    :total="logTotal" :current-page="logPage" :page-size="logPageSize" :fetching="logLoading"
    @page-change="handleLogPageChange" />
</template>
<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue';
import MainLayout from '@/components/MainLayout.vue';
// AppButton 已移除，使用全局CSS样式
import { ElMessage } from 'element-plus';
import { Connection, Key, Link, Lock, Tickets, User } from '@element-plus/icons-vue';
import { apiConfigAPI } from '@/api/apiConfigAPI';
import { ozonPreferenceAPI } from '@/api/ozonPreferenceAPI';
import { alibabaAPI } from '@/api/alibabaAPI';
import { ozonWorkerAPI, type OzonBrowserWorker } from '@/api/ozonWorkerAPI';
import ApiConfigPanel from './components/ApiConfigPanel.vue';
import AppUpdateButton from '@/components/ui/AppUpdateButton.vue';
import AppDetailDialog from '@/components/ui/AppDetailDialog.vue';
import AppDialog from '@/components/ui/AppDialog.vue';
import { useUpdateStore } from '@/store/updateStore';
import { getOzonCategoryCreatedTime, syncOzonCategoriesIncremental, getCategorySyncLogs } from '@/api/ozonCategoryAPI';
import { platformIconUrls } from '@/utils/assetUrls';
import { hasUsableAlibabaToken } from './alibabaAuthState';

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password';
  placeholder: string;
  icon: any;
}

interface PlatformConfig {
  description: string;
  fields: ConfigField[];
}

const platformConfigs: Record<string, PlatformConfig> = {
  'wechat-login': {
    description: '微信公众号或小程序的登录凭证，用于实现微信登录功能，请在微信公众平台或微信开放平台获取相关凭证',
    fields: [
      { key: 'appId', label: 'App ID', type: 'text', placeholder: '请输入App ID', icon: Tickets },
      { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: '请输入App Secret', icon: Lock },
    ],
  },
  'wechat-pay': {
    description: '微信支付商户号和密钥，用于处理订单支付和退款等交易功能，请在微信支付商户平台获取相关凭证和证书',
    fields: [
      { key: 'mchId', label: '商户号', type: 'text', placeholder: '请输入商户号', icon: User },
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: '请输入API Key', icon: Key },
      { key: 'certPath', label: '证书路径', type: 'text', placeholder: '请输入证书路径', icon: Link },
    ],
  },
  'sms': {
    description: '阿里云号码认证服务中的短信认证配置，不使用普通短信验证码资质、签名和模板申请流程',
    fields: [
      { key: 'endpoint', label: 'API 地址', type: 'text', placeholder: 'https://dypnsapi.aliyuncs.com', icon: Link },
      { key: 'accessKeyId', label: 'AccessKey ID', type: 'text', placeholder: '请输入AccessKey ID', icon: Key },
      { key: 'accessKeySecret', label: 'AccessKey Secret', type: 'password', placeholder: '请输入AccessKey Secret', icon: Lock },
      { key: 'signName', label: '短信认证签名', type: 'text', placeholder: '请输入号码认证控制台提供的赠送签名', icon: Connection },
    ],
  },
  'translation': {
    description: '中俄翻译API配置，用于商品标题、描述等内容的自动翻译功能，通常使用腾讯云翻译或百度翻译等服务商提供的翻译服务',
    fields: [
      { key: 'url', label: 'API地址', type: 'text', placeholder: '请输入API地址', icon: Link },
      { key: 'secretId', label: 'Secret ID', type: 'text', placeholder: '请输入Secret ID', icon: User },
      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: '请输入Secret Key', icon: Lock },
    ],
  },
  '1688': {
    description: '1688平台授权配置，用于获取商品详情、库存等信息，请使用阿里百川开放平台申请应用',
    fields: [
      { key: 'redirectUri', label: '回调地址', type: 'text', placeholder: '请输入回调地址', icon: Link },
      { key: 'appKey', label: 'App Key', type: 'text', placeholder: '请输入App Key', icon: Key },
      { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: '请输入App Secret', icon: Lock },
    ],
  },
};

const savedTab = localStorage.getItem('apiConfigActiveTab');
const activeTab = ref(savedTab || 'wechat-login');
const activeTabRef = computed(() => activeTab.value);
watch(activeTabRef, (newTab) => {
  localStorage.setItem('apiConfigActiveTab', newTab);
});

const editingPlatform = ref<string | null>(null);
const testingConnection = ref<string | null>(null);
const isSaving = ref(false);
const isFetchingCookie = ref(false);
const isImportingCookie = ref(false);
const isLoadingOzonConfig = ref(false);
const isLoadingWorkers = ref(false);
const isCreatingWorker = ref(false);
const ozonCookieData = ref<any>(null);
const ozonWorkers = ref<OzonBrowserWorker[]>([]);
const showWorkerTokenDialog = ref(false);
const workerConfigSnippet = ref('');
const ozonConfig = ref<any>(null);
const cookieFileInput = ref<HTMLInputElement | null>(null);
const showCookieDetailModal = ref(false);

// Ozon优选设置
const showOzonSettingsModal = ref(false);
const isSyncingCategories = ref(false);
const isClearingCache = ref(false);
const isSavingPreference = ref(false);
const preferenceConfig = ref<any>({
  searchLimit: 50,
  cacheMaxAge: 2,
  lastCategorySync: null,
});
const preferenceForm = reactive({
  searchLimit: 50,
  cacheMaxAge: 2,
});
const cacheInfo = reactive({
  size: 0,
  fileCount: 0,
  formattedSize: '0 B',
});

// 类目更新相关状态
const lastUpdateTime = ref<Date | null>(null);
const updateStatus = ref('');
const showDetailDialog = ref(false);
const detailType = ref('category');
const logList = ref<any[]>([]);
const logTotal = ref(0);
const logPage = ref(1);
const logPageSize = ref(10);
const logLoading = ref(false);

// 全局更新状态管理
const updateStore = useUpdateStore();
const OZON_PREFERENCE_MODULE = 'ozon-preference';

// localStorage 持久化 key
const CATEGORY_UPDATE_STORAGE_KEY = 'ozon_category_updating';
const CATEGORY_UPDATE_START_TIME_KEY = 'ozon_category_update_start_time';

const alibabaAuthStatus = reactive({
  hasToken: false,
  isExpired: true,
  remainingSeconds: 0,
  obtainedAt: null as string | null,
  expiresAt: null as string | null,
});

const configs = ref<Record<string, any>>({
  'wechat-login': null,
  'wechat-pay': null,
  'sms': null,
  'translation': null,
  '1688': null,
});

const editForm = reactive<any>({});

const getAlibabaFieldValue = (key: 'appKey' | 'appSecret' | 'redirectUri') => {
  if (editingPlatform.value === '1688') {
    return editForm[key] || '';
  }
  if (key === 'appSecret') {
    return (configs.value['1688'] || {}).appSecret ? '•••••••' : '-';
  }
  return (configs.value['1688'] || {})[key] || '-';
};

const handleAlibabaFieldUpdate = (key: 'appKey' | 'appSecret' | 'redirectUri', value: string | number) => {
  if (editingPlatform.value !== '1688') return;
  editForm[key] = String(value);
};

const handleEditFormUpdate = (value: Record<string, string>) => {
  Object.keys(editForm).forEach(key => delete editForm[key]);
  Object.assign(editForm, value);
};

const handleEdit = (platform: string) => {
  editingPlatform.value = platform;
  if (configs.value[platform]) {
    Object.assign(editForm, configs.value[platform]);
  } else {
    Object.keys(editForm).forEach(key => delete editForm[key]);
  }
};

const validateRequiredFields = (platform: string) => {
  const fields = platformConfigs[platform]?.fields || [];
  const emptyField = fields.find(field => !String(editForm[field.key] ?? '').trim());
  if (emptyField) {
    ElMessage.warning(`请填写${emptyField.label}`);
    return false;
  }
  return true;
};

const handleSave = async (platform: string) => {
  if (!validateRequiredFields(platform)) {
    return;
  }

  isSaving.value = true;
  try {
    const response = await apiConfigAPI.updateConfig(platform, { config: { ...editForm } });
    if (response.success) {
      configs.value[platform] = { ...editForm };
      ElMessage.success('配置保存成功');
      editingPlatform.value = null;
    } else {
      ElMessage.error(response.message || '保存配置失败');
    }
  } catch {
    ElMessage.error('保存配置失败');
  } finally {
    isSaving.value = false;
  }
};

const handleCancel = () => {
  editingPlatform.value = null;
  Object.keys(editForm).forEach(key => delete editForm[key]);
};

const testConnection = async (platform: string) => {
  testingConnection.value = platform;
  try {
    if (editingPlatform.value === platform) {
      try {
        const response = await apiConfigAPI.updateConfig(platform, { config: { ...editForm } });
        if (response.success) {
          configs.value[platform] = { ...editForm };
        } else {
          ElMessage.error('请先保存配置');
          return;
        }
      } catch (error) {
        ElMessage.error('请先保存配置');
        return;
      }
    }
    const response = await apiConfigAPI.testConnection(platform);
    if (response.success) {
      ElMessage.success(response.message || '连接测试成功');
    } else {
      ElMessage.error(response.message || '连接测试失败');
    }
  } catch {
    ElMessage.error('连接测试失败');
  } finally {
    testingConnection.value = null;
  }
};

const loadConfigs = async (showError = true): Promise<boolean> => {
  try {
    const response = await apiConfigAPI.getConfigs();
    if (response.success && response.data) {
      response.data.forEach((config: any) => {
        configs.value[config.platform] = config.config;
      });
      const alibabaConfig = configs.value['1688'];
      if (alibabaConfig && alibabaConfig.authStatus) {
        const status = alibabaConfig.authStatus;
        alibabaAuthStatus.hasToken = status.hasToken;
        alibabaAuthStatus.isExpired = status.isExpired;
        alibabaAuthStatus.remainingSeconds = status.remainingSeconds;
        alibabaAuthStatus.obtainedAt = status.obtainedAt;
        alibabaAuthStatus.expiresAt = status.expiresAt;
      }
      return true;
    }
    return false;
  } catch (error: any) {
    if (showError) {
      const msg = error.response?.data?.message || error.message || '加载配置失败';
      ElMessage.error(`配置刷新失败: ${msg}`);
    }
    return false;
  }
};

const buildWorkerConfigSnippet = (token: string) => {
  const apiBaseUrl = window.location.origin;
  return JSON.stringify({
    apiBaseUrl,
    workerToken: token,
    repoRoot: 'D:/project/ozon',
    pythonPath: 'py',
    pollIntervalSeconds: 5,
    scriptTimeoutSeconds: 600,
  }, null, 2);
};

const loadOzonWorkers = async () => {
  isLoadingWorkers.value = true;
  try {
    const response = await ozonWorkerAPI.listWorkers();
    if (response.success) {
      ozonWorkers.value = response.data || [];
    } else {
      ElMessage.error(response.message || '采集器状态获取失败');
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || error.message || '采集器状态获取失败');
  } finally {
    isLoadingWorkers.value = false;
  }
};

const createOzonWorker = async () => {
  isCreatingWorker.value = true;
  try {
    const response = await ozonWorkerAPI.createWorker(`本机采集器 ${new Date().toLocaleString()}`);
    if (!response.success || !response.data?.token) {
      ElMessage.error(response.message || '采集器令牌生成失败');
      return;
    }
    workerConfigSnippet.value = buildWorkerConfigSnippet(response.data.token);
    showWorkerTokenDialog.value = true;
    await loadOzonWorkers();
    ElMessage.success('采集器令牌已生成');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || error.message || '采集器令牌生成失败');
  } finally {
    isCreatingWorker.value = false;
  }
};

const copyWorkerConfig = async () => {
  try {
    await navigator.clipboard.writeText(workerConfigSnippet.value);
    ElMessage.success('配置已复制');
  } catch {
    ElMessage.warning('复制失败，请手动复制配置内容');
  }
};

const fetchOzonCookie = async () => {
  isFetchingCookie.value = true;
  try {
    const response = await apiConfigAPI.fetchOzonCookie();
    if (response.success) {
      ozonCookieData.value = response.data;
      // 刷新 ozonConfig（从 preference API 读 cookieStatus）
      await loadOzonConfig();
      ElMessage.success(response.message || 'Cookie获取成功');
    } else {
      ElMessage.error(response.message || 'Cookie获取失败');
    }
  } catch {
    ElMessage.error('Cookie获取失败');
  } finally {
    isFetchingCookie.value = false;
  }
};

// Ozon优选设置
const openOzonSettings = async () => {
  showOzonSettingsModal.value = true;
  // 加载配置
  try {
    const response = await ozonPreferenceAPI.getConfig();
    if (response.success && response.data) {
      preferenceConfig.value = response.data;
      preferenceForm.searchLimit = response.data.searchLimit;
      preferenceForm.cacheMaxAge = response.data.cacheMaxAge;
      cacheInfo.formattedSize = response.data.cacheSize || '0 B';
      cacheInfo.fileCount = response.data.cacheFileCount || 0;
    }
  } catch {
  }
};

// 获取最新更新时间
const fetchLastUpdateTime = async (): Promise<{ lastUpdateTime: string | Date; status: 'idle' | 'success' | 'error' }> => {
  try {
    const response = await getOzonCategoryCreatedTime();
    if (response.data) {
      lastUpdateTime.value = new Date(response.data);
      updateStatus.value = '更新成功';
    }
    const status: 'idle' | 'success' | 'error' = lastUpdateTime.value ? 'success' : 'idle';
    return {
      lastUpdateTime: lastUpdateTime.value || '',
      status
    };
  } catch {
    return { lastUpdateTime: '', status: 'idle' };
  }
};

// 更新按钮点击处理
const handleUpdateClick = () => {
  updateCategories();
};

// 详情链接点击处理 - 打开类目更新日志弹窗
const handleDetailClick = () => {
  showDetailDialog.value = true;
  fetchLogs();
};

const refreshApiConfigPageData = async () => {
  await Promise.allSettled([
    loadConfigs(false),
    loadOzonCookie(),
    loadOzonConfig(),
    loadOzonWorkers(),
    showDetailDialog.value ? fetchLogs() : Promise.resolve(),
  ]);
};

// 检查类目更新完成
const checkCategoryUpdateComplete = async () => {
  let retries = 0;
  while (retries < 20 && isSyncingCategories.value) {
    updateStore.setUpdateProgress(OZON_PREFERENCE_MODULE, Math.min(90, 12 + retries * 4));
    try {
      const timeResponse = await getOzonCategoryCreatedTime();
      const currentTime = timeResponse.success && timeResponse.data ? new Date(timeResponse.data).getTime() : 0;
      const storedTime = localStorage.getItem(CATEGORY_UPDATE_START_TIME_KEY);
      if (storedTime && currentTime >= parseInt(storedTime)) { finishCategoryUpdate(true); return; }
    } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 3000));
    retries++;
  }
  if (isSyncingCategories.value) finishCategoryUpdate(false, '类目更新超时');
};

// 完成类目更新
const finishCategoryUpdate = async (success: boolean, msg?: string) => {
  if (success) {
    updateStore.setUpdateProgress(OZON_PREFERENCE_MODULE, 100);
  }
  updateStore.stopUpdate(OZON_PREFERENCE_MODULE);
  isSyncingCategories.value = false;
  localStorage.removeItem(CATEGORY_UPDATE_STORAGE_KEY);
  localStorage.removeItem(CATEGORY_UPDATE_START_TIME_KEY);

  lastUpdateTime.value = new Date();
  updateStatus.value = success ? '更新成功' : '更新失败';

  await new Promise(r => setTimeout(r, 350));
  ElMessage({ message: msg || (success ? '类目更新成功' : '类目更新失败'), type: success ? 'success' : 'error', duration: 3000 });
};

// 更新类目
const updateCategories = async () => {
  if (updateStore.isUpdating(OZON_PREFERENCE_MODULE)) return;

  updateStore.startUpdate(OZON_PREFERENCE_MODULE, {
    scope: 'global',
    statusText: '正在更新',
    progress: 0,
  });
  localStorage.setItem(CATEGORY_UPDATE_STORAGE_KEY, 'true');
  localStorage.setItem(CATEGORY_UPDATE_START_TIME_KEY, Date.now().toString());

  isSyncingCategories.value = true;

  try {
    const response = await syncOzonCategoriesIncremental();
    if (response.success) {
      checkCategoryUpdateComplete();
    } else {
      finishCategoryUpdate(false, response.message);
    }
  } catch (error: any) {
    finishCategoryUpdate(false, error.message);
  }
};

// 获取更新日志
const fetchLogs = async () => {
  logLoading.value = true;
  try {
    const response = await getCategorySyncLogs(logPage.value, logPageSize.value);
    if (response.success) {
      logList.value = response.data.list || [];
      logTotal.value = response.data.total || 0;
    }
  } catch {
  } finally {
    logLoading.value = false;
  }
};

// 日志分页切换
const handleLogPageChange = (page: number) => {
  logPage.value = page;
  fetchLogs();
};

const handleClearCache = async () => {
  isClearingCache.value = true;
  try {
    const response = await ozonPreferenceAPI.clearCache();
    if (response.success) {
      cacheInfo.formattedSize = '0 B';
      cacheInfo.fileCount = 0;
      ElMessage.success(response.message || '缓存已清除');
    } else {
      ElMessage.error(response.message || '清除缓存失败');
    }
  } catch {
    ElMessage.error('清除缓存失败');
  } finally {
    isClearingCache.value = false;
  }
};

const savePreferenceConfig = async () => {
  isSavingPreference.value = true;
  try {
    const response = await ozonPreferenceAPI.saveConfig({
      searchLimit: preferenceForm.searchLimit,
      cacheMaxAge: preferenceForm.cacheMaxAge,
    });
    if (response.success) {
      preferenceConfig.value = response.data;
      showOzonSettingsModal.value = false;
      ElMessage.success('设置已保存');
    } else {
      ElMessage.error(response.message || '保存失败');
    }
  } catch {
    ElMessage.error('保存设置失败');
  } finally {
    isSavingPreference.value = false;
  }
};

const triggerCookieFileImport = () => {
  cookieFileInput.value?.click();
};

const handleCookieFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  isImportingCookie.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiConfigAPI.importOzonCookie(formData);
    if (response.success) {
      ozonCookieData.value = response.data;
      await loadOzonConfig();
      ElMessage.success(response.message || 'Cookie导入成功');
    } else {
      ElMessage.error(response.message || 'Cookie导入失败');
    }
  } catch {
    ElMessage.error('Cookie导入失败');
  } finally {
    isImportingCookie.value = false;
    if (target) {
      target.value = '';
    }
  }
};

const loadOzonCookie = async () => {
  try {
    const response = await apiConfigAPI.getOzonCookie();
    if (response.success && response.data) {
      ozonCookieData.value = response.data;
    }
  } catch {
  }
};

/** 从 preference API 加载 ozonConfig（含 cookieStatus） */
const loadOzonConfig = async () => {
  isLoadingOzonConfig.value = true;
  try {
    const response = await ozonPreferenceAPI.getConfig();
    if (response.success && response.data) {
      ozonConfig.value = response.data;
    }
  } catch {
  } finally {
    isLoadingOzonConfig.value = false;
  }
};

const showAlibabaAuthRefreshResult = (refreshed: boolean) => {
  if (!refreshed) {
    ElMessage.warning('Token已获取，但配置刷新失败，请手动刷新页面');
    return;
  }

  if (hasUsableAlibabaToken(alibabaAuthStatus)) {
    ElMessage.success('授权成功');
    return;
  }

  ElMessage.error('授权未完成，请重新授权');
};

const handle1688Auth = async () => {
  try {
    const result = await alibabaAPI.getAuthorizeInfo();
    if (result.success && result.data?.managedUrl) {
      const authWindow = window.open(
        result.data.managedUrl,
        'alibaba_auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );
      if (!authWindow) {
        ElMessage.error('请允许弹窗以完成授权');
        return;
      }
      ElMessage.info('授权页面已打开，请在新窗口完成授权');

      const exchangeCodeForToken = async (code: string) => {
        try {
          const tokenResult = await alibabaAPI.exchangeToken(code);
          if (tokenResult.success && tokenResult.data) {
            const refreshed = await loadConfigs();
            showAlibabaAuthRefreshResult(refreshed);
          } else {
            ElMessage.error(tokenResult.message || 'Token换取失败');
          }
        } catch {
          ElMessage.error('换取Token失败，请检查后端服务');
        }
      };

      let pollTimer: ReturnType<typeof setInterval> | null = null;
      const startTokenPolling = () => {
        if (pollTimer) clearInterval(pollTimer);
        let attempts = 0;
        const maxAttempts = 40;
        pollTimer = setInterval(async () => {
          attempts++;
          try {
            const result = await alibabaAPI.getAuthStatus();
            if (result.success && result.data && result.data.hasToken && !result.data.isExpired) {
              const refreshed = await loadConfigs();
              showAlibabaAuthRefreshResult(refreshed);
              if (pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
              }
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }
            }
          } catch (e) {
          }
          if (attempts >= maxAttempts || (authWindow && authWindow.closed)) {
            if (pollTimer) {
              clearInterval(pollTimer);
              pollTimer = null;
            }
          }
        }, 3000);
      };

      startTokenPolling();

      const messageHandler = async (event: MessageEvent) => {
        const data = event.data;
        if (!data) return;
        if (data.type === 'ALIBABA_AUTH_SUCCESS') {
          const refreshed = await loadConfigs();
          showAlibabaAuthRefreshResult(refreshed);
          window.removeEventListener('message', messageHandler);
          if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
          }
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
          return;
        }
        if (data.type === 'ALIBABA_AUTH_COMPLETE') {
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
        }
        if (data.type === 'ALIBABA_AUTH_CODE' && data.code) {
          exchangeCodeForToken(data.code);
          window.removeEventListener('message', messageHandler);
        }
      };

      window.addEventListener('message', messageHandler);

      let elapsed = 0;
      const checkInterval = setInterval(() => {
        elapsed += 2;
        if (authWindow.closed) {
          clearInterval(checkInterval);
          window.removeEventListener('message', messageHandler);
          setTimeout(() => {
            if (pollTimer) {
              clearInterval(pollTimer);
              pollTimer = null;
            }
          }, 12000);
          return;
        }
        if (elapsed > 120) {
          clearInterval(checkInterval);
          window.removeEventListener('message', messageHandler);
          if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
          }
          ElMessage.warning('等待授权超时，请重新尝试');
        }
      }, 2000);
    } else {
      ElMessage.error('获取授权链接失败，请检查配置');
    }
  } catch {
    ElMessage.error('获取授权链接失败，请检查后端服务');
  }
};

const formatDate = (date: Date): string => {
  if (isNaN(date.getTime())) {
    return '未知';
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const formatSeconds = (seconds: number): string => {
  if (seconds <= 0) {
    return '-';
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  return `${minutes}分钟`;
};

watch(
  () => updateStore.isUpdating(OZON_PREFERENCE_MODULE),
  async (updating, wasUpdating) => {
    isSyncingCategories.value = updating;
    if (!wasUpdating || updating) return;
    await refreshApiConfigPageData();
  }
);

onMounted(() => {
  const shouldResumeCategoryUpdate =
    updateStore.isUpdating(OZON_PREFERENCE_MODULE) ||
    localStorage.getItem(CATEGORY_UPDATE_STORAGE_KEY) === 'true';

  if (shouldResumeCategoryUpdate) {
    if (!updateStore.isUpdating(OZON_PREFERENCE_MODULE)) {
      updateStore.startUpdate(OZON_PREFERENCE_MODULE, {
        scope: 'global',
        statusText: '正在更新',
        progress: 12,
      });
    }
    isSyncingCategories.value = true;
    void checkCategoryUpdateComplete();
    return;
  }

  loadConfigs();
  loadOzonCookie();
  loadOzonConfig();
  loadOzonWorkers();
});

onUnmounted(() => {});
</script>

<style scoped>
.api-config-page-panel,
.api-config-page-card {
  width: 100%;
  min-height: 0;
}

.api-config-page-panel {
  display: flex;
  min-height: var(--app-page-min-height);
}

.api-config-page-card {
  display: flex;
  flex-direction: column;
  min-height: var(--app-page-min-height);
  overflow: hidden;
}

.api-config-page-card :deep(.el-tabs) {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
}

.api-config-page-card :deep(.el-tabs__content) {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.api-config-page-card :deep(.el-tab-pane) {
  height: 100%;
}

.config-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 34px;
  border-bottom: none;
}

.config-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.config-tabs :deep(.el-tabs__item) {
  height: 52px;
  line-height: 52px;
  padding: 0 24px 0 0;
  font-size: 13px;
  font-weight: 400;
  color: #475569;
}

.config-tabs :deep(.el-tabs__item.is-active) {
  font-weight: 600;
  color: #2563eb;
}

.config-tabs :deep(.el-tabs__active-bar) {
  height: 2px;
  background-color: #3b82f6;
}

.api-config-tab-panel {
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.alibaba-auth-card {
  margin-bottom: 18px !important;
}

.alibaba-auth-card > div {
  padding-top: 16px !important;
  padding-bottom: 16px !important;
}

.ozon-config-wrap {
  max-width: 960px;
}

.ozon-config-header {
  padding-top: 12px !important;
  padding-bottom: 12px !important;
}

.ozon-config-icon {
  width: 44px !important;
  height: 44px !important;
  border-radius: 12px !important;
}

.ozon-config-icon svg {
  width: 22px !important;
  height: 22px !important;
}

.ozon-config-body {
  padding: 22px 34px 20px !important;
}

.ozon-stats-block {
  margin-bottom: 18px !important;
}

.ozon-status-card {
  padding: 14px 16px !important;
}

.ozon-action-area {
  padding-top: 8px !important;
  padding-bottom: 0 !important;
}

.ozon-action-area p {
  margin-bottom: 14px !important;
}

.alibaba-config-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 680px;
  margin-left: 32px;
}

.api-config-field {
  display: grid;
  grid-template-columns: 108px minmax(0, 360px);
  align-items: center;
  min-height: 38px;
  column-gap: 16px;
}

.api-config-label {
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  line-height: 18px;
  text-align: left;
}

.api-config-control {
  min-width: 0;
}

.api-config-input :deep(.el-input__wrapper) {
  min-height: 34px;
  padding: 0 11px;
  background-color: #ffffff;
  border: 1px solid #dbe4f0;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.api-config-input :deep(.el-input__wrapper:hover) {
  border-color: #b8c6d8;
}

.api-config-input :deep(.el-input__wrapper.is-focus) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.api-config-input.is-disabled,
.api-config-input.is-disabled :deep(.el-input__wrapper),
.api-config-input.is-disabled :deep(.el-input__wrapper:hover),
.api-config-input.is-disabled :deep(.el-input__wrapper.is-focus) {
  cursor: default !important;
}

.api-config-input.is-disabled :deep(.el-input__wrapper),
.api-config-input.is-disabled :deep(.el-input__wrapper:hover),
.api-config-input.is-disabled :deep(.el-input__wrapper.is-focus) {
  border-color: #dbe4f0 !important;
  background-color: #ffffff !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
}

.api-config-input :deep(.el-input__inner) {
  color: #1e293b;
  font-size: 13px;
}

.api-config-input.is-disabled :deep(.el-input__prefix-inner),
.api-config-input.is-disabled :deep(.el-input__inner),
.api-config-input.is-disabled :deep(.el-input__inner:disabled) {
  color: #334155 !important;
  -webkit-text-fill-color: #334155 !important;
  cursor: default !important;
}

.api-config-input.is-disabled :deep(.el-input__prefix),
.api-config-input.is-disabled :deep(.el-input__suffix) {
  cursor: default !important;
}

.api-config-input :deep(.el-input__prefix-inner) {
  color: #94a3b8;
}

.api-config-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  padding-top: 12px;
  margin-left: 124px;
}

.api-config-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: color 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.api-config-button:hover:not(:disabled):not(.is-disabled) {
  transform: translateY(-1px);
}

.api-config-button:active:not(:disabled):not(.is-disabled) {
  transform: translateY(0);
}

.api-config-button--primary {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.api-config-button--primary:hover:not(:disabled):not(.is-disabled) {
  color: #ffffff;
  background: #2563eb;
  border-color: #2563eb;
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.18);
}

.api-config-button--secondary {
  color: #475569;
  background: #f8fafc;
  border-color: #dbe4f0;
}

.api-config-button--secondary:hover:not(:disabled):not(.is-disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.api-config-button:disabled,
.api-config-button.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ozon-preference-dialog :deep(.el-slider) {
  height: 18px;
}

.ozon-preference-dialog :deep(.el-slider__runway) {
  margin: 7px 0;
}

.worker-token-code {
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #0f172a;
  color: #dbeafe;
  padding: 12px;
  font-size: 12px;
  line-height: 1.6;
  text-align: left;
}
</style>
