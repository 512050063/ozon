<template>
  <div class="app-shell h-screen bg-slate-100 flex overflow-hidden w-full">
    <AppUpdateProgressBar
      :visible="globalUpdateVisible"
      :title="globalUpdateTitle"
      :progress="globalUpdateProgress"
      :message="globalUpdateMessage"
      :progress-text="globalUpdateText"
      is-global
    />
    <!-- 左侧菜单栏 -->
    <aside class="app-sidebar bg-white border-r border-slate-200 flex-shrink-0 fixed h-screen z-10 flex flex-col text-sm">
      <!-- 品牌区域 -->
      <div class="h-16 px-6 flex items-center border-b border-slate-200 flex-shrink-0">
        <div
          class="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mr-3"
        >
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <span class="text-lg font-semibold text-slate-800">Ozon工具</span>
      </div>

      <!-- 导航菜单 -->
      <nav class="flex-1 px-4 py-6 overflow-y-auto max-h-[calc(100vh-64px)]">
        <div class="space-y-1">
          <!-- 主页信息 -->
          <button
            v-if="hasPermission('dashboard')"
            @click.stop="navigateTo('/dashboard')"
            :class="[
              'w-full flex items-center px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer',
              currentPath === '/dashboard'
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
            ]"
          >
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            主页信息
          </button>

          <!-- 选品分析 - 支持子菜单 -->
          <div class="space-y-1" v-if="hasPermission('product-analysis')">
            <button
              @click="toggleProductAnalysisSubmenu"
              :class="[
                'w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer',
                currentPath === '/product-analysis' || currentPath === '/price-management'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
              ]"
            >
              <div class="flex items-center">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                选品分析
              </div>
              <svg
                class="w-3.5 h-3.5 transition-transform duration-200 text-slate-400"
                :class="{ 'rotate-90': productAnalysisSubmenuOpen }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <!-- 子菜单 -->
            <div v-if="productAnalysisSubmenuOpen" class="submenu-group ml-4 mt-1 space-y-1">
              <!-- ozon 优选 -->
              <button
                v-if="hasPermission('product-analysis')"
                @click.stop="navigateTo('/product-analysis/ozon-preference')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/product-analysis/ozon-preference'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
                ozon 优选
              </button>
              <!-- 竞价监控 -->
              <button
                v-if="hasPermission('price-management')"
                @click.stop="navigateTo('/product-analysis/bidding-monitor')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/product-analysis/bidding-monitor'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                竞价监控
              </button>
            </div>
          </div>

          <!-- 货源采集 - 支持子菜单 -->
          <div class="space-y-1" v-if="hasPermission('source-collection')">
            <button
              @click="toggleSourceCollectionSubmenu"
              :class="[
                'w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer',
                currentPath.startsWith('/source-collection')
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
              ]"
            >
              <div class="flex items-center">
                <svg
                  class="w-5 h-5 mr-3"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                  />
                </svg>
                货源采集
              </div>
              <svg
                class="w-3.5 h-3.5 transition-transform duration-200 text-slate-400"
                :class="{ 'rotate-90': sourceCollectionSubmenuOpen }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div v-if="sourceCollectionSubmenuOpen" class="submenu-group ml-4 mt-1 space-y-1">
              <button
                v-if="hasPermission('source-collection/product-collection')"
                @click.stop="navigateTo('/source-collection/product-collection')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/source-collection/product-collection'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
                  />
                </svg>
                商品采集
              </button>
              <button
                v-if="hasPermission('source-collection/supply-management')"
                @click.stop="navigateTo('/source-collection/supply-management')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/source-collection/supply-management'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5v-9zM7 9h10M7 13h6"
                  />
                </svg>
                货源管理
              </button>
            </div>
          </div>

          <!-- 本地仓库 - 支持子菜单 -->
          <div class="space-y-1" v-if="hasPermission('warehouse')">
            <button
              @click="toggleWarehouseSubmenu"
              :class="[
                'w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer',
                currentPath === '/warehouse/product-library' || currentPath === '/warehouse/material-library'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
              ]"
            >
              <div class="flex items-center">
                <svg
                  class="w-5 h-5 mr-3"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122"
                  />
                </svg>
                本地仓库
              </div>
              <svg
                class="w-3.5 h-3.5 transition-transform duration-200 text-slate-400"
                :class="{ 'rotate-90': warehouseSubmenuOpen }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <!-- 子菜单 -->
            <div v-if="warehouseSubmenuOpen" class="submenu-group ml-4 mt-1 space-y-1">
              <button
                v-if="hasPermission('warehouse/product-library')"
                @click.stop="navigateTo('/warehouse/product-library')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/warehouse/product-library'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859M12 3v8.25m0 0-3-3 3-3"
                  />
                </svg>
                商品库
              </button>
              <!-- 素材库 -->
              <button
                v-if="hasPermission('warehouse/material-library')"
                @click.stop="navigateTo('/warehouse/material-library')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/warehouse/material-library'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                素材库
              </button>
            </div>
          </div>

          <!-- Ozon店铺 - 支持子菜单 -->
          <div class="space-y-1" v-if="hasPermission('ozon')">
            <button
              @click="toggleOzonSubmenu"
              :class="[
                'w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer',
                currentPath === '/ozon/store-management' ||
                currentPath === '/ozon/order-management' ||
                currentPath.startsWith('/ozon/promotions') ||
                currentPath === '/ozon/finance-report' ||
                currentPath === '/ozon/product-management' ||
                currentPath === '/ozon/pricing'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
              ]"
            >
              <div class="flex items-center">
                <svg
                  class="w-5 h-5 mr-3"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
                  />
                </svg>
                Ozon店铺
              </div>
              <svg
                class="w-3.5 h-3.5 transition-transform duration-200 text-slate-400"
                :class="{ 'rotate-90': ozonSubmenuOpen }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <!-- 子菜单 -->
            <div v-if="ozonSubmenuOpen" class="submenu-group ml-4 mt-1 space-y-1">
              <button
                v-if="hasPermission('ozon/store-management')"
                @click.stop="navigateTo('/ozon/store-management')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/ozon/store-management'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819"
                  />
                </svg>
                店铺管理
              </button>
              <button
                v-if="hasPermission('ozon/product-management')"
                @click.stop="navigateTo('/ozon/product-management')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/ozon/product-management'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                  />
                </svg>
                商品管理
              </button>
              <button
                v-if="
                  hasPermission('ozon/order-management') ||
                  hasPermission('ozon/product-management') ||
                  hasPermission('ozon/pricing')
                "
                @click.stop="navigateTo('/ozon/order-management')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/ozon/order-management'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 12h6m-6 4h6M6.75 3.75h10.5A2.25 2.25 0 0119.5 6v12a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 18V6a2.25 2.25 0 012.25-2.25z"
                  />
                </svg>
                订单管理
              </button>
              <button
                v-if="hasPermission('ozon/promotions')"
                @click.stop="navigateTo('/ozon/promotions')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath.startsWith('/ozon/promotions')
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.091-3.091L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.091-3.091L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.091 3.091L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.091 3.091ZM18.25 8.25 17.625 10.5 17 8.25A3.375 3.375 0 0 0 14.75 6L17 5.375 17.625 3l.625 2.375A3.375 3.375 0 0 0 20.5 7.625L18.25 8.25ZM18.25 20.25 17.625 22.5 17 20.25A3.375 3.375 0 0 0 14.75 18L17 17.375 17.625 15l.625 2.375A3.375 3.375 0 0 0 20.5 19.625L18.25 20.25Z"
                  />
                </svg>
                促销活动
              </button>
              <!-- 财务报告 -->
              <button
                v-if="hasPermission('ozon/finance-report')"
                @click.stop="navigateTo('/ozon/finance-report')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/ozon/finance-report'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                财务报告
              </button>
              <!-- 定价策略 -->
              <button
                v-if="hasPermission('ozon/pricing')"
                @click.stop="navigateTo('/ozon/pricing')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/ozon/pricing'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v7.5m2.25-6.466a9.016 9.016 0 0 0-3.461-.203c-.536.072-.974.478-1.021 1.017a4.559 4.559 0 0 0-.018.402c0 .464.336.844.775.994l2.95 1.012c.44.15.775.53.775.994 0 .136-.006.27-.018.402-.047.539-.485.945-1.021 1.017a9.077 9.077 0 0 1-3.461-.203M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
                定价策略
              </button>
            </div>
          </div>

          <!-- 智能客服 - 支持子菜单 -->
          <div
            class="space-y-1"
            v-if="
              hasPermission('ozon/customer-service') ||
              hasPermission('ozon/customer-service/auto-reply') ||
              hasPermission('ozon/customer-service/messages')
            "
          >
            <button
              @click="toggleCustomerServiceSubmenu"
              :class="[
                'w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer',
                currentPath === '/customer-service' || currentPath === '/customer-service/messages'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
              ]"
            >
              <div class="flex items-center">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                智能客服
              </div>
              <svg
                class="w-3.5 h-3.5 transition-transform duration-200 text-slate-400"
                :class="{ 'rotate-90': customerServiceSubmenuOpen }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div v-if="customerServiceSubmenuOpen" class="submenu-group ml-4 mt-1 space-y-1">
              <button
                v-if="hasPermission('ozon/customer-service') || hasPermission('ozon/customer-service/auto-reply')"
                @click.stop="navigateTo('/customer-service')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/customer-service'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                自动回复
              </button>
              <button
                v-if="hasPermission('ozon/customer-service') || hasPermission('ozon/customer-service/messages')"
                @click.stop="navigateTo('/customer-service/messages')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/customer-service/messages'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-1m8-7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l4-4h2a2 2 0 002-2z"
                  />
                </svg>
                消息中心
              </button>
            </div>
          </div>

          <!-- 系统设置 - 支持子菜单 -->
          <div class="space-y-1" v-if="hasPermission('settings')">
            <button
              @click="toggleSettingsSubmenu"
              :class="[
                'w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer',
                currentPath === '/settings/account-info' ||
                currentPath === '/vip' ||
                currentPath === '/settings/role-management' ||
                currentPath === '/settings/user-management' ||
                currentPath === '/settings/payment-records' ||
                currentPath === '/settings/api-config'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
              ]"
            >
              <div class="flex items-center">
                <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                系统设置
              </div>
              <svg
                class="w-3.5 h-3.5 transition-transform duration-200 text-slate-400"
                :class="{ 'rotate-90': settingsSubmenuOpen }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <!-- 子菜单 -->
            <div v-if="settingsSubmenuOpen" class="submenu-group ml-4 mt-1 space-y-1">
              <!-- 账号信息 -->
              <button
                v-if="hasPermission('settings/account-info')"
                @click.stop="navigateTo('/settings/account-info')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/settings/account-info'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
                账号信息
              </button>
              <!-- 角色管理 -->
              <button
                v-if="hasPermission('settings/role-management')"
                @click.stop="navigateTo('/settings/role-management')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/settings/role-management'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg
                  class="w-4 h-4 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z"
                  />
                </svg>
                角色管理
              </button>
              <!-- 用户管理 -->
              <button
                v-if="hasPermission('settings/user-management')"
                @click.stop="navigateTo('/settings/user-management')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/settings/user-management'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                用户管理
              </button>
              <!-- 充值记录 -->
              <button
                v-if="hasPermission('settings/payment-records')"
                @click.stop="navigateTo('/settings/payment-records')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/settings/payment-records'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                充值记录
              </button>
              <!-- API配置 -->
              <button
                v-if="hasPermission('settings/api-config')"
                @click.stop="navigateTo('/settings/api-config')"
                :class="[
                  'w-full flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
                  currentPath === '/settings/api-config'
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                ]"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                API配置
              </button>
            </div>
          </div>
        </div>
      </nav>
    </aside>

    <!-- 主内容区域 -->
    <main class="app-main flex-1 min-w-0 overflow-hidden flex flex-col">
      <!-- 顶部栏 -->
      <header class="app-topbar bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0 z-30">
        <!-- 面包屑导航 -->
        <div class="app-breadcrumb">
          <span class="app-breadcrumb-title">{{ currentTitle }}</span>
        </div>

        <!-- 用户区域 - 调整顺序 -->
        <div class="flex items-center gap-2">
          <el-tooltip placement="bottom" effect="dark">
            <template #content>
              <div class="store-context-tooltip">
                <div class="tooltip-title">店铺设置</div>
                <div class="tooltip-row">
                  <span class="tooltip-label">当前店铺：</span>
                  <span class="tooltip-value">{{ currentStoreSummary.name }}</span>
                </div>
                <div class="tooltip-row">
                  <span class="tooltip-label">店铺ID：</span>
                  <span class="tooltip-value">{{ currentStoreSummary.clientId }}</span>
                </div>
                <div class="tooltip-row">
                  <span class="tooltip-label">说明：</span>
                  <span class="tooltip-value">{{ currentStoreSummary.description }}</span>
                </div>
              </div>
            </template>
            <button
              type="button"
              class="store-context-trigger"
              @click="openStoreSelector"
            >
              <el-icon v-if="storeSelectorLoading" class="is-loading"><Loading /></el-icon>
              <el-icon v-else><Shop /></el-icon>
            </button>
          </el-tooltip>

          <!-- 消息通知 -->
          <button
            @click="openMessageCenter"
            class="relative w-9 h-9 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.124 7.5A8.969 8.969 0 0 1 5.292 3m13.416 0a8.969 8.969 0 0 1 2.168 4.5"
              />
            </svg>
            <span
              v-if="hasUnreadMessages"
              class="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
            />
          </button>

          <!-- 会员图标 -->
          <button
            v-if="authStore.user"
            @click="showVipInfo"
            class="w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 hover:bg-slate-50"
          >
            <img
              :src="memberIcon"
              :alt="authStore.user?.memberLevel"
              class="w-[30px] h-auto object-contain max-h-[24px]"
            />
          </button>

          <!-- 用户信息 - 悬浮下拉菜单 -->
          <div class="relative" ref="userMenuRef">
            <button
              @mouseenter="showUserMenu = true"
              class="flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors"
            >
              <div class="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                <img
                  v-if="authStore.user?.avatar"
                  :src="getFullImageUrl(authStore.user.avatar) || undefined"
                  class="w-full h-full object-cover"
                  alt="头像"
                />
                <span v-else class="text-blue-600 font-semibold text-sm tracking-wide">{{
                  authStore.user?.nickname?.charAt(0)?.toUpperCase() ||
                  authStore.user?.username?.charAt(0)?.toUpperCase()
                }}</span>
              </div>
              <span class="text-[13px] font-medium tracking-normal text-slate-700 leading-none">{{
                authStore.user?.nickname
              }}</span>
            </button>

            <!-- 下拉菜单 -->
            <div
              v-show="showUserMenu"
              @mouseleave="showUserMenu = false"
              class="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
            >
              <!-- 个人中心 -->
              <button
                @click="
                  navigateTo('/settings/account-info');
                  showUserMenu = false;
                "
                class="w-full px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span>个人中心</span>
              </button>
              <!-- 分割线 -->
              <div class="border-t border-slate-200 my-1"></div>
              <!-- 注销登录 -->
              <button
                @click="handleLogout"
                class="w-full px-3 py-2 text-[13px] text-red-600 hover:bg-slate-50 flex items-center justify-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>注销登录</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- 页面内容 -->
      <div
        class="page-content-shell min-w-0 overflow-x-hidden overflow-y-auto flex-1"
        :class="pageContentClasses"
      >
        <slot></slot>
        <div v-if="currentPageUpdating" class="page-update-mask"></div>
      </div>
    </main>

    <!-- 会员信息弹窗 -->
    <el-dialog
      v-model="showVipDialog"
      :title="null"
      width="960px"
      :before-close="handleVipDialogClose"
      class="vip-dialog"
      custom-class="vip-dialog"
      :show-close="false"
    >
      <!-- 弹窗头部 -->
      <div class="app-surface-header mx-4 mb-6">
        <div class="app-surface-icon">
          <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.5 8.5l3.6 3.2L12 5l3.9 6.7 3.6-3.2-1.4 8.2H5.9L4.5 8.5z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6.5 19h11" />
          </svg>
        </div>
        <div class="app-surface-title-wrapper">
          <h3 class="app-surface-title">会员套餐</h3>
          <p class="app-surface-subtitle">选择适合您的会员方案，解锁更多功能</p>
        </div>
      </div>
      <div class="vip-dialog-content p-4 pb-6">
        <VIPView />
      </div>
    </el-dialog>

    <el-dialog
      v-model="showStoreSelectorDialog"
      width="520px"
      :show-close="false"
      destroy-on-close
      class="store-selector-dialog"
      custom-class="store-selector-dialog"
    >
      <template #header>
        <div class="store-dialog-header app-surface-header">
          <div class="store-dialog-icon app-surface-icon">
            <el-icon><Shop /></el-icon>
          </div>
          <div class="store-dialog-title-wrapper app-surface-title-wrapper">
            <h3 class="store-dialog-title app-surface-title">选择当前操作店铺</h3>
            <p class="store-dialog-subtitle app-surface-subtitle">订单、商品管理、财务和消息模块将使用该店铺</p>
          </div>
        </div>
      </template>

      <div class="store-selector-body">
        <div class="store-selector-list">
          <button
            v-for="store in availableStores"
            :key="store.id"
            type="button"
            class="store-selector-item"
            :class="{ 'is-active': store.id === currentStoreId }"
            :disabled="settingCurrentStoreId === store.id"
            @click="handleSelectStore(store)"
          >
            <div class="store-selector-main">
              <div class="store-selector-name-row">
                <span class="store-selector-name">{{ store.name }}</span>
                <span v-if="store.id === currentStoreId" class="store-selector-badge">当前</span>
              </div>
              <div class="store-selector-meta">
                <span>ID：{{ store.clientId }}</span>
                <span>{{ getCountryName(store.country) }}</span>
                <span>{{ store.currency || 'CNY' }}</span>
              </div>
            </div>
            <el-icon v-if="settingCurrentStoreId === store.id" class="is-loading store-selector-icon"><Loading /></el-icon>
            <el-icon v-else class="store-selector-icon"><Shop /></el-icon>
          </button>
          <div v-if="!storeSelectorLoading && availableStores.length === 0" class="store-selector-empty">
            暂无可选店铺
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
  import { useAuthStore } from '@/store/authStore';
  import { useRouter, useRoute } from 'vue-router';
  import { computed, defineAsyncComponent, ref, onMounted, watch } from 'vue';
  import { ElMessage } from 'element-plus';
  import { Loading, Shop } from '@element-plus/icons-vue';
  import { useUpdateStore } from '@/store/updateStore';
  import { AppUpdateProgressBar } from '@/components/ui';
  import VipDialogSkeleton from '@/components/ui/VipDialogSkeleton.vue';
  import { getFullImageUrl } from '@/utils/common';
  import { membershipIconUrls } from '@/utils/assetUrls';
  import { getUpdateModuleForPath } from '@/utils/updateRouteScope';
  import { ozonMessageAPI } from '@/api/ozonMessageAPI';
  import { ozonStoreAPI } from '@/api/ozonStoreAPI';
  import { useOzonStoreContext } from '@/composables/useOzonStoreContext';
  import { sumUnreadCount } from '@/views/customer-service/message-center/messageCenterDataSource';
  import type { OzonStore } from '@/types';

  const authStore = useAuthStore();
  const router = useRouter();
  const route = useRoute();
  const updateStore = useUpdateStore();
  const VIPView = defineAsyncComponent({
    loader: () => import('@/views/pages/VIP.vue'),
    loadingComponent: VipDialogSkeleton,
    delay: 0,
  });
  const unreadMessageCount = ref(0);
  const MESSAGE_UNREAD_CACHE_KEY = 'ozon_message_unread_cache';
  const showStoreSelectorDialog = ref(false);
  const storeSelectorLoading = ref(false);
  const settingCurrentStoreId = ref<number | null>(null);
  const availableStores = ref<OzonStore[]>([]);
  const { loadStoreContext, applyStoreContext, storeContext } = useOzonStoreContext();
  const currentStoreId = computed(() => storeContext.value?.currentOzonStoreId ?? storeContext.value?.resolvedStoreId ?? null);
  const hasUnreadMessages = computed(() => unreadMessageCount.value > 0);
  const currentStoreSummary = computed(() => {
    const currentStore = storeContext.value?.store;
    if (!currentStore) {
      return {
        name: '未设置',
        clientId: '-',
        description: '请先在顶部选择当前操作店铺',
      };
    }

    return {
      name: currentStore.name,
      clientId: currentStore.clientId || '-',
      description: '订单、商品管理、财务和消息模块将使用该店铺',
    };
  });
  const currentUpdateModule = computed(() => getUpdateModuleForPath(route.path));
  const flexiblePagePaths = [
    '/dashboard',
    '/product-analysis/ozon-preference',
    '/product-analysis/bidding-monitor',
    '/warehouse/product-library',
    '/ozon/product-management',
    '/ozon/order-management',
  ];
  const isFlexiblePage = computed(() =>
    flexiblePagePaths.some(path => route.path === path || route.path.startsWith(`${path}/`))
  );
  const pageContentClasses = computed(() => ({
    'page-content-shell--flexible': isFlexiblePage.value,
    'page-content-shell--fixed': !isFlexiblePage.value,
  }));
  const globalUpdateEntry = computed(() => {
    const module = currentUpdateModule.value;
    if (module) {
      const meta = updateStore.getModuleMeta(module);
      if (meta.updating) return { module, ...meta };
    }

    return null;
  });
  const currentPageUpdating = computed(() => {
    const module = currentUpdateModule.value;
    return Boolean(module && updateStore.getModuleMeta(module).updating);
  });
  const globalUpdateVisible = computed(() => Boolean(globalUpdateEntry.value));
  const globalUpdateTitle = computed(() => {
    const module = globalUpdateEntry.value?.module || '';
    if (module === 'ozon-preference' && route.path.startsWith('/settings/api-config')) {
      return '类目更新中';
    }
    const titles: Record<string, string> = {
      'product-management': '商品更新中',
      'order-management': '订单更新中',
      'finance-report': '财报更新中',
      'promotions': '活动更新中',
      'ozon-preference': '优选更新中',
      'store-management': '店铺更新中',
      'api-config': '类目更新中',
    };
    return titles[module] || '正在更新';
  });
  const globalUpdateProgress = computed(() => globalUpdateEntry.value?.progress || 0);
  const globalUpdateMessage = computed(() => globalUpdateEntry.value?.message || '');
  const globalUpdateText = computed(() => {
    const meta = globalUpdateEntry.value;
    if (!meta) return '';
    return '';
  });

  // 会员信息弹窗显示状态
  const showVipDialog = ref(false);

  // 显示会员信息弹窗
  const showVipInfo = () => {
    showVipDialog.value = true;
  };

  // 关闭会员信息弹窗
  const handleVipDialogClose = () => {
    showVipDialog.value = false;
  };

  // 检查用户是否有权限访问某个菜单
  const hasPermission = (menuKey: string): boolean => {
    // 如果用户未登录或没有角色，返回 false
    if (!authStore.user?.role) {
      return false;
    }

    // 检查用户角色的权限列表
    const permissions: string[] = authStore.user.role.permissions || [];

    // 父菜单：如果有父菜单权限码，或者有任何子菜单权限，则显示
    if (menuKey === 'warehouse') {
      return (
        permissions.includes('warehouse') ||
        permissions.includes('warehouse/product-library') ||
        permissions.includes('warehouse/material-library')
      );
    }
    if (menuKey === 'ozon') {
      return (
        permissions.includes('ozon') ||
        permissions.includes('ozon/store-management') ||
        permissions.includes('ozon/order-management') ||
        permissions.includes('ozon/promotions') ||
        permissions.includes('ozon/product-management') ||
        permissions.includes('ozon/pricing') ||
        permissions.includes('ozon/finance-report') ||
        permissions.includes('ozon/customer-service') ||
        permissions.includes('ozon/customer-service/auto-reply') ||
        permissions.includes('ozon/customer-service/messages')
      );
    }
    if (menuKey === 'settings') {
      return (
        permissions.includes('settings') ||
        permissions.includes('settings/account-info') ||
        permissions.includes('settings/role-management') ||
        permissions.includes('settings/user-management') ||
        permissions.includes('settings/payment-records') ||
        permissions.includes('settings/api-config') ||
        permissions.includes('vip')
      );
    }
    if (menuKey === 'product-analysis') {
      return permissions.includes('product-analysis') || permissions.includes('price-management');
    }
    if (menuKey === 'source-collection') {
      return (
        permissions.includes('source-collection') ||
        permissions.includes('source-collection/product-collection') ||
        permissions.includes('source-collection/supply-management')
      );
    }
    if (
      menuKey === 'source-collection/product-collection' ||
      menuKey === 'source-collection/supply-management'
    ) {
      return permissions.includes(menuKey) || permissions.includes('source-collection');
    }
    // 检查子菜单权限
    return permissions.includes(menuKey);
  };

  // 子菜单状态
  const settingsSubmenuOpen = ref(false);
  const warehouseSubmenuOpen = ref(false);
  const ozonSubmenuOpen = ref(false);
  const customerServiceSubmenuOpen = ref(false);
  const productAnalysisSubmenuOpen = ref(false);
  const sourceCollectionSubmenuOpen = ref(false);

  // 用户菜单状态
  const showUserMenu = ref(false);

  // 初始化时检查路由，确定子菜单是否应该展开
  const checkRouteAndExpandSubmenus = () => {
    if (route.path.startsWith('/settings') || route.path === '/vip') {
      settingsSubmenuOpen.value = true;
    }
    if (route.path.startsWith('/warehouse')) {
      warehouseSubmenuOpen.value = true;
    }
    if (route.path.startsWith('/ozon')) {
      ozonSubmenuOpen.value = true;
    }
    if (route.path.startsWith('/customer-service')) {
      customerServiceSubmenuOpen.value = true;
    }
    if (route.path.startsWith('/product-analysis') || route.path.startsWith('/price-management')) {
      productAnalysisSubmenuOpen.value = true;
    }
    if (route.path.startsWith('/source-collection')) {
      sourceCollectionSubmenuOpen.value = true;
    }
  };

  const readUnreadCache = (): Record<string, number> => {
    try {
      return JSON.parse(localStorage.getItem(MESSAGE_UNREAD_CACHE_KEY) || '{}');
    } catch {
      return {};
    }
  };

  const writeUnreadCache = (storeId: number, count: number) => {
    const cache = readUnreadCache();
    cache[String(storeId)] = count;
    localStorage.setItem(MESSAGE_UNREAD_CACHE_KEY, JSON.stringify(cache));
  };

  const applyCachedUnreadCount = (storeId: number | null | undefined): boolean => {
    if (!storeId) {
      unreadMessageCount.value = 0;
      return false;
    }

    const cache = readUnreadCache();
    const cachedCount = cache[String(storeId)];
    if (typeof cachedCount !== 'number') return false;
    unreadMessageCount.value = cachedCount;
    return true;
  };

  const loadUnreadMessageCount = async (forceRefresh = false) => {
    if (!authStore.user) {
      unreadMessageCount.value = 0;
      return;
    }

    try {
      const context = await loadStoreContext(true);
      const storeId = context?.resolvedStoreId;
      if (!storeId) {
        unreadMessageCount.value = 0;
        return;
      }

      if (!forceRefresh && applyCachedUnreadCount(storeId)) {
        return;
      }

      const response = await ozonMessageAPI.getConversations(storeId, {
        channel: 'buyer',
        limit: 100,
      });
      const conversations = response.success ? (response.data?.conversations || []) : [];
      unreadMessageCount.value = sumUnreadCount(conversations);
      writeUnreadCache(storeId, unreadMessageCount.value);
    } catch {
      unreadMessageCount.value = 0;
    }
  };

  const getCountryName = (country: string) => {
    const countryMap: Record<string, string> = {
      RU: '俄罗斯',
      KZ: '哈萨克斯坦',
      BY: '白俄罗斯',
      KG: '吉尔吉斯斯坦',
      AM: '亚美尼亚',
      AZ: '阿塞拜疆',
      UZ: '乌兹别克斯坦',
      TJ: '塔吉克斯坦',
      TM: '土库曼斯坦',
      MD: '摩尔多瓦',
      GE: '格鲁吉亚',
    };
    return countryMap[country] || country || '-';
  };

  const loadAvailableStores = async () => {
    storeSelectorLoading.value = true;
    try {
      const response = await ozonStoreAPI.getStores();
      if (!response.success || !response.data) {
        availableStores.value = [];
        ElMessage.error(response.message || '获取店铺列表失败');
        return;
      }

      availableStores.value = response.data;
      const currentStore = response.data.find(store => store.isCurrent) || null;
      if (currentStore) {
        applyStoreContext({
          currentOzonStoreId: currentStore.id,
          resolvedStoreId: currentStore.id,
          store: currentStore,
        });
      } else {
        applyStoreContext(null);
      }
    } catch (error: any) {
      availableStores.value = [];
      applyStoreContext(null);
      ElMessage.error(error.message || '获取店铺列表失败');
    } finally {
      storeSelectorLoading.value = false;
    }
  };

  const openStoreSelector = async () => {
    showStoreSelectorDialog.value = true;
    await loadAvailableStores();
  };

  const handleSelectStore = async (store: OzonStore) => {
    if (settingCurrentStoreId.value === store.id) return;

    settingCurrentStoreId.value = store.id;
    try {
      const response = await ozonStoreAPI.setCurrentStore(store.id);
      if (!response.success) {
        ElMessage.error(response.message || '设置当前操作店铺失败');
        return;
      }

      applyStoreContext(response.data || null);
      await loadAvailableStores();
      await loadUnreadMessageCount(true);
      showStoreSelectorDialog.value = false;
      ElMessage.success('当前操作店铺已更新');
    } catch (error: any) {
      ElMessage.error(error.message || '设置当前操作店铺失败');
    } finally {
      settingCurrentStoreId.value = null;
    }
  };

  const openMessageCenter = () => {
    router.push('/customer-service/messages');
  };

  onMounted(() => {
    checkRouteAndExpandSubmenus();
    loadUnreadMessageCount();
  });

  // 监听路由变化，自动展开对应的子菜单
  watch(
    () => route.path,
    () => {
      checkRouteAndExpandSubmenus();
    }
  );

  // 会员等级图标映射
  const memberIcon = computed(() => {
    if (!authStore.user) {
      return membershipIconUrls.free;
    }
    const level = authStore.user.memberLevel || 'free';
    return membershipIconUrls[level] || membershipIconUrls.free;
  });

  // 获取当前路径
  const currentPath = computed(() => route.path);

  // 获取当前页面标题
  const currentTitle = computed(() => {
    if (currentPath.value.startsWith('/ozon/promotions/')) {
      return 'Ozon店铺 > 促销活动';
    }
    const titles: Record<string, string> = {
      '/dashboard': '主页信息',
      '/product-analysis/ozon-preference': '选品分析 > ozon 优选',
      '/product-analysis/bidding-monitor': '选品分析 > 竞价监控',
      '/source-collection': '货源采集',
      '/source-collection/product-collection': '货源采集 > 商品采集',
      '/source-collection/supply-management': '货源采集 > 货源管理',
      '/warehouse': '本地仓库',
      '/warehouse/product-library': '本地仓库 > 商品库',
      '/warehouse/material-library': '本地仓库 > 素材库',
      '/ozon/store-management': 'Ozon店铺 > 店铺管理',
      '/ozon/order-management': 'Ozon店铺 > 订单管理',
      '/ozon/promotions': 'Ozon店铺 > 促销活动',
      '/ozon/finance-report': 'Ozon店铺 > 财务报告',
      '/ozon/product-management': 'Ozon店铺 > 商品管理',
      '/ozon/pricing': 'Ozon店铺 > 定价策略',
      '/customer-service': '智能客服 > 自动回复',
      '/customer-service/messages': '智能客服 > 消息中心',
      '/settings': '系统设置',
      '/settings/api-config': '系统设置 > API配置',
      '/settings/user-management': '系统设置 > 用户管理',
      '/settings/payment-records': '系统设置 > 充值记录',
      '/settings/account-info': '系统设置 > 账号信息',
      '/settings/role-management': '系统设置 > 角色管理',
      '/vip': '系统设置 > 会员信息',
      '/404': '页面不存在',
      '/500': '页面运行异常',
      '/502': '模块加载失败',
    };
    return titles[currentPath.value] || '主页信息';
  });

  // 导航函数 - 不自动关闭子菜单
  const navigateTo = async (path: string) => {
    if (route.path === path) {
      return;
    }

    try {
      await router.push(path);
    } catch (error: any) {
      const message = String(error?.message || error || '');
      if (message.includes('Failed to fetch dynamically imported module')) return;
      throw error;
    }
  };

  // 切换系统设置子菜单
  const toggleSettingsSubmenu = () => {
    settingsSubmenuOpen.value = !settingsSubmenuOpen.value;
  };

  // 切换本地仓库子菜单
  const toggleWarehouseSubmenu = () => {
    warehouseSubmenuOpen.value = !warehouseSubmenuOpen.value;
  };

  // 切换 Ozon 子菜单
  const toggleOzonSubmenu = () => {
    ozonSubmenuOpen.value = !ozonSubmenuOpen.value;
  };

  // 切换智能客服子菜单
  const toggleCustomerServiceSubmenu = () => {
    customerServiceSubmenuOpen.value = !customerServiceSubmenuOpen.value;
  };

  // 切换选品分析子菜单
  const toggleProductAnalysisSubmenu = () => {
    productAnalysisSubmenuOpen.value = !productAnalysisSubmenuOpen.value;
  };

  // 切换货源采集子菜单
  const toggleSourceCollectionSubmenu = () => {
    sourceCollectionSubmenuOpen.value = !sourceCollectionSubmenuOpen.value;
  };

  // 退出登录
  const handleLogout = async () => {
    await authStore.logoutRemote();
    router.push('/auth');
  };
</script>

<style scoped>
.store-context-trigger {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  color: #475569;
  background: transparent;
  transition: all 0.2s ease;
}

.store-context-trigger :deep(.el-icon) {
  width: 20px;
  height: 20px;
  font-size: 20px;
}

.store-context-trigger:hover {
  color: #2563eb;
  background: #eff6ff;
}

.store-context-tooltip {
  min-width: 220px;
  font-size: 12px;
  line-height: 1.6;
}

.tooltip-title {
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 6px;
}

.tooltip-row {
  display: flex;
  gap: 4px;
}

.tooltip-label {
  color: rgba(255, 255, 255, 0.72);
  flex-shrink: 0;
}

.tooltip-value {
  color: #ffffff;
  font-weight: 500;
}

.store-selector-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

:deep(.el-dialog.store-selector-dialog) {
  height: 420px;
  max-height: 420px;
  display: flex;
  flex-direction: column;
}

:deep(.el-dialog.store-selector-dialog .el-dialog__header) {
  flex-shrink: 0;
  padding: 0;
  margin: 0;
}

:deep(.el-dialog.store-selector-dialog .el-dialog__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.store-dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 24px 18px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.78);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.72));
}

.store-dialog-icon {
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 0;
  border: 1px solid rgba(191, 219, 254, 0.86);
  border-radius: 14px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  color: #2563eb;
  font-size: 24px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    0 8px 18px rgba(37, 99, 235, 0.12);
}

.store-dialog-title-wrapper {
  min-width: 0;
  text-align: left;
}

.store-dialog-title {
  margin: 0 0 4px;
  font-size: 18px;
  line-height: 24px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 0;
}

.store-dialog-subtitle {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: #64748b;
}

.store-selector-body {
  flex: 1;
  height: 100%;
  min-height: 0;
  padding: 16px 24px 20px;
  overflow-y: auto;
}

.store-selector-item {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #ffffff;
  text-align: left;
  transition: all 0.2s ease;
}

.store-selector-item:hover {
  border-color: #93c5fd;
  background: #f8fbff;
}

.store-selector-item.is-active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.store-selector-item:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.store-selector-main {
  min-width: 0;
  flex: 1;
}

.store-selector-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.store-selector-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.store-selector-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 9999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.store-selector-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #64748b;
}

.store-selector-icon {
  flex-shrink: 0;
  color: #3b82f6;
  font-size: 18px;
}

.store-selector-empty {
  padding: 24px 0;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

.page-content-shell {
  position: relative;
  min-height: 0;
}

.page-content-shell--fixed {
  height: calc(100vh - var(--app-topbar-height, 64px));
  min-height: calc(100vh - var(--app-topbar-height, 64px));
  overflow-y: auto;
}

.page-content-shell--flexible {
  min-height: calc(100vh - var(--app-topbar-height, 64px));
}

.app-breadcrumb {
  display: flex;
  align-items: center;
  min-width: 0;
  max-width: min(520px, 46vw);
  height: 100%;
}

.app-breadcrumb-title {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  letter-spacing: 0;
  color: #334155;
}

.page-update-mask {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.38);
  backdrop-filter: blur(1px);
  pointer-events: all;
}

.submenu-group {
  margin-left: 1rem;
  padding-left: 0.5rem;
}

.submenu-group > button {
  padding-top: 0.45rem;
  padding-bottom: 0.45rem;
  border-radius: 10px;
  font-size: 12.5px;
  padding-left: 0.85rem;
  padding-right: 0.85rem;
}

.submenu-group > button svg {
  opacity: 0.9;
}

.submenu-group > button + button {
  margin-top: 2px;
}

/* VIP 弹窗样式 */
:global(.vip-dialog.el-dialog),
:global(.vip-dialog .el-dialog) {
  width: min(960px, 84vw) !important;
  margin: 5vh auto 0;
  max-height: calc(100vh - 72px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px !important;
}

:global(.vip-dialog .el-dialog__header) {
  display: none;
}

:global(.vip-dialog .el-dialog__body) {
  padding: 0;
  overflow: hidden;
  border-radius: inherit;
  flex: 0 1 auto;
}

.vip-dialog-content {
  min-height: 0;
  padding: 0 16px 20px !important;
  overflow: hidden;
  border-radius: 8px;
}

:global(.vip-dialog .app-surface-header) {
  margin: 16px 16px 18px !important;
  border-radius: 8px;
  overflow: hidden;
}

  nav,
  nav :deep(*),
  aside,
  aside :deep(*) {
    cursor: pointer !important;
  }
</style>
