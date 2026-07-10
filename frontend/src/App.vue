<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '@/store/authStore';

const authStore = useAuthStore();

onMounted(() => {
  if (authStore.isAuthenticated) {
    authStore.startSessionMonitor();
  }
});

onUnmounted(() => {
  authStore.stopSessionMonitor();
});

watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      authStore.startSessionMonitor();
    } else {
      authStore.stopSessionMonitor();
    }
  }
);
</script>

<style scoped>
  #app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #2c3e50;
    min-height: 100vh;
  }
</style>
