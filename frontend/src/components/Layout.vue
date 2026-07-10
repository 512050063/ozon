<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 顶部导航 -->
    <nav class="bg-white shadow-sm border-b border-gray-200">
      <div class="container-fluid">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <!-- Logo -->
            <div class="flex-shrink-0 flex items-center">
              <svg class="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span class="ml-2 text-xl font-bold text-gray-900">Ozon工具</span>
            </div>

            <!-- 导航链接 -->
            <div class="hidden md:ml-6 md:flex md:space-x-4">
              <router-link
                v-for="item in navItems"
                :key="item.path"
                :to="item.path"
                :class="[
                  'px-3 py-2 rounded-md text-sm font-medium',
                  isActive(item.path)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                ]"
              >
                {{ item.name }}
              </router-link>
            </div>
          </div>

          <!-- 右侧 -->
          <div class="flex items-center space-x-4">
            <button class="p-1 rounded-full text-gray-400 hover:text-gray-500">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>
            <div class="flex items-center space-x-3">
              <span class="text-sm text-gray-700">{{ authStore.user?.username }}</span>
              <button @click="handleLogout" class="text-sm text-gray-500 hover:text-gray-700">退出</button>
            </div>
          </div>
        </div>

        <!-- 移动端导航 -->
        <div class="md:hidden border-t border-gray-200">
          <div class="flex space-x-1 py-3 overflow-x-auto">
            <router-link
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex-1 text-center px-2 py-1 text-xs font-medium rounded',
                isActive(item.path) ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
              ]"
            >
              {{ item.name }}
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <!-- 主内容 -->
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
  import { useRouter, useRoute } from 'vue-router';
  import { useAuthStore } from '@/store/authStore';

  const router = useRouter();
  const route = useRoute();
  const authStore = useAuthStore();

  const navItems = [
    { path: '/dashboard', name: '控制面板' },
    { path: '/products', name: '产品管理' },
    { path: '/warehouse', name: '仓库管理' },
    { path: '/analysis', name: '产品分析' },
    { path: '/ozon', name: 'Ozon店铺' },
    { path: '/settings', name: '系统设置' },
  ];

  const isActive = (path: string) => {
    return route.path === path || route.path.startsWith(path + '/');
  };

  const handleLogout = async () => {
    await authStore.logoutRemote();
    router.push('/auth');
  };
</script>
