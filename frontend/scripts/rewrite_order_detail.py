# -*- coding: utf-8 -*-
"""重写订单详情抽屉模板，按完整字段清单覆盖6组数据"""

filepath = r'D:\project\ozon\frontend\src\views\ozon\OrderManagementView.vue'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 定位主容器
start = None
end = None
for i, line in enumerate(lines):
    if 'v-if="selectedOrder"' in line and 'px-5 pb-6 space-y-4' in line:
        start = i
    if start is not None and i > start and '</el-drawer>' in line.strip():
        for j in range(i - 1, start + 5, -1):
            stripped = lines[j].strip()
            if stripped == '</div>':
                end = j
                break
        break

print(f"Replacing lines {start+1} to {end+1}")
print(f"Start: {lines[start].rstrip()!r}")
print(f"End:   {lines[end].rstrip()!r}")

new_template = '''        <div v-if="selectedOrder" class="px-5 pb-6 space-y-4">

            <!-- ========== 1. 订单基础信息 ========== -->

            <div class="bg-slate-50 rounded-lg p-4">
              <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-3">
                <span class="w-1 h-4 bg-blue-500 rounded mr-2"></span>
                订单基础信息
              </h4>
              <div class="grid grid-cols-2 gap-x-10 gap-y-2.5">
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">Ozon订单ID</span>
                  <span class="text-xs text-slate-900 font-medium truncate ml-2">{{ formatRawValue(selectedOrder.raw?.order_id) }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">订单号</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.order_number) }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">发货单号</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ selectedOrder.postingNumber || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">父发货单号</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.parent_posting_number) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">快递员信息</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.courier) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">客户资料</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.customer) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">价格币种</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.prr_option?.currency_code) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">目的地</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.destination_place_name) || '-' }}</span>
                </div>
              </div>
            </div>

            <!-- ========== 2. 状态与时间线 ========== -->

            <div class="bg-slate-50 rounded-lg p-4">
              <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-3">
                <span class="w-1 h-4 bg-violet-500 rounded mr-2"></span>
                状态与时间线
              </h4>
              <div class="grid grid-cols-2 gap-x-10 gap-y-2.5">
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">状态</span>
                  <el-tag size="small" :type="statusTagType(selectedOrder.status)">{{ statusLabel(selectedOrder.status) }}</el-tag>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">子状态</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.substatus) || selectedOrder.substatus || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">前一子状态</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.previous_substatus) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">进入处理</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(selectedOrder.inProcessAt) }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">开始配送</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(selectedOrder.raw?.delivering_date) }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">实际签收</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(selectedOrder.raw?.fact_delivery_date) || formatDateTime(selectedOrder.deliveredAt) }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">计划发货</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(selectedOrder.raw?.shipment_date) }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">无延迟发货</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(selectedOrder.raw?.shipment_date_without_delay) }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">提货码核验</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(selectedOrder.raw?.pickup_code_verified_at) }}</span>
                </div>
              </div>
            </div>

            <!-- ========== 3. 商品明细（含尺寸重量） ========== -->

            <div class="bg-slate-50 rounded-lg p-4">
              <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-3">
                <span class="w-1 h-4 bg-indigo-500 rounded mr-2"></span>
                商品明细
              </h4>

              <!-- 商品列表 -->
              <div class="space-y-4">
                <div v-for="(product, idx) in (selectedOrder.products || selectedOrder.raw?.products)" :key="product.sku || idx"
                     class="border border-slate-200 rounded-lg p-3">
                  <!-- 商品头部：图片+名称+价格 -->
                  <div class="flex items-start gap-3 mb-3">
                    <img v-if="getProductImage(product, selectedOrder)"
                         :src="getProductImage(product, selectedOrder)"
                         class="w-16 h-16 rounded-lg object-cover border border-slate-200 flex-shrink-0 bg-white" alt="" />
                    <div v-else class="w-16 h-16 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-xs text-slate-400 flex-shrink-0">无图</div>
                    <div class="flex-1 min-w-0">
                      <div class="text-[13px] text-slate-800 leading-snug text-left">{{ product.name }}</div>
                      <div class="flex gap-4 mt-1 text-xs text-slate-500">
                        <span>SKU: {{ product.sku }}</span>
                        <span>OfferID: {{ product.offer_id || '-' }}</span>
                        <span class="font-medium text-slate-700">{{ formatPrice(product.price) }} {{ product.currency_code || '' }}</span>
                        <span>x{{ product.quantity }}</span>
                      </div>
                    </div>
                  </div>
                  <!-- 商品尺寸/重量详情 -->
                  <div class="grid grid-cols-4 gap-x-6 gap-y-2 pl-1 border-t border-slate-100 pt-2">
                    <div><span class="text-[11px] text-slate-400">宽度</span><div class="text-xs text-slate-700 mt-0.5">{{ formatRawValue(product.dimensions?.width) || '-' }} mm</div></div>
                    <div><span class="text-[11px] text-slate-400">高度</span><div class="text-xs text-slate-700 mt-0.5">{{ formatRawValue(product.dimensions?.height) || '-' }} mm</div></div>
                    <div><span class="text-[11px] text-slate-400">长度</span><div class="text-xs text-slate-700 mt-0.5">{{ formatRawValue(product.dimensions?.length) || '-' }} mm</div></div>
                    <div><span class="text-[11px] text-slate-400">重量</span><div class="text-xs text-slate-700 mt-0.5">{{ formatRawValue(product.dimensions?.weight) || '-' }} g</div></div>
                    <div><span class="text-[11px] text-slate-400">最大重量</span><div class="text-xs text-slate-700 mt-0.5">{{ product.weight_max ?? '-' }} kg</div></div>
                    <div><span class="text-[11px] text-slate-400">最小重量</span><div class="text-xs text-slate-700 mt-0.5">{{ product.weight_min ?? '-' }} kg</div></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ========== 4. 物流与配送 ========== -->

            <div class="bg-slate-50 rounded-lg p-4">
              <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-3">
                <span class="w-1 h-4 bg-teal-500 rounded mr-2"></span>
                物流与配送
              </h4>
              <div class="grid grid-cols-2 gap-x-10 gap-y-2.5">
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">跟踪号</span>
                  <span class="text-xs text-slate-900 truncate ml-2 font-mono">{{ formatRawValue(selectedOrder.raw?.tracking_number) || selectedOrder.trackingNumber || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">是否快递</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ selectedOrder.raw?.is_express ? '是' : '否' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">运费</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.delivery_price) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">配送方式ID</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.delivery_method?.id) || '-' }}</span>
                </div>
                <div class="col-span-2 flex items-start justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">配送方式名称</span>
                  <span class="text-xs text-slate-900 text-right truncate max-w-[320px] ml-2">{{ formatRawValue(selectedOrder.raw?.delivery_method?.name) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">发货仓库</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.delivery_method?.warehouse) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">物流商</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.delivery_method?.tpl_provider) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">配送类型</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.analytics_data?.delivery_type) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">收货地区</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.analytics_data?.region) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">收货城市</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.analytics_data?.city) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">Premium会员</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ selectedOrder.raw?.analytics_data?.is_premium ? '是' : '否' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">支付方式</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.analytics_data?.payment_type_group_name) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">预计送达起</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(selectedOrder.raw?.analytics_data?.delivery_date_begin) }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">预计送达止</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatDateTime(selectedOrder.raw?.analytics_data?.delivery_date_end) }}</span>
                </div>
                <div class="col-span-2 flex items-start justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">详细地址</span>
                  <span class="text-xs text-slate-900 text-right truncate max-w-[320px] ml-2">{{ formatFullAddress(selectedOrder.raw) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">联系电话</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.addressee?.phone) || '-' }}</span>
                </div>
              </div>
            </div>

            <!-- ========== 5. 财务结算 ========== -->

            <div class="bg-slate-50 rounded-lg p-4">
              <h4 class="text-[13px] font-semibold text-slate-700 flex items-center mb-3">
                <span class="w-1 h-4 bg-orange-500 rounded mr-2"></span>
                财务结算
              </h4>
              <div class="grid grid-cols-2 gap-x-10 gap-y-2.5">
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">发货区域</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.financial_data?.cluster_from) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-slate-500 flex-shrink-0">收货区域</span>
                  <span class="text-xs text-slate-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.financial_data?.cluster_to) || '-' }}</span>
                </div>
                <!-- 每个商品的财务明细 -->
                <template v-for="(fp, fidx) in (selectedOrder.raw?.financial_data?.products || [])" :key="fidx">
                  <div class="col-span-2 pt-2 mt-1 border-t border-slate-200">
                    <span class="text-[11px] text-slate-400 font-medium">商品 {{ fidx + 1 }} (SKU: {{ fp.product_id }})</span>
                  </div>
                  <div class="flex items-center justify-between min-w-0">
                    <span class="text-xs text-slate-500 flex-shrink-0">数量</span>
                    <span class="text-xs text-slate-900 truncate ml-2">{{ fp.quantity }}</span>
                  </div>
                  <div class="flex items-center justify-between min-w-0">
                    <span class="text-xs text-slate-500 flex-shrink-0">商品原价</span>
                    <span class="text-xs text-slate-900 truncate ml-2">{{ fp.price }} {{ fp.currency_code || '' }}</span>
                  </div>
                  <div class="flex items-center justify-between min-w-0">
                    <span class="text-xs text-slate-500 flex-shrink-0">旧价</span>
                    <span class="text-xs text-slate-900 truncate ml-2">{{ fp.old_price }} {{ fp.currency_code || '' }}</span>
                  </div>
                  <div class="flex items-center justify-between min-w-0">
                    <span class="text-xs text-slate-500 flex-shrink-0">客户实付单价</span>
                    <span class="text-xs text-slate-900 truncate ml-2 font-medium text-blue-600">{{ fp.customer_price }} {{ fp.customer_currency_code || '' }}</span>
                  </div>
                  <div class="flex items-center justify-between min-w-0">
                    <span class="text-xs text-slate-500 flex-shrink-0">佣金比例</span>
                    <span class="text-xs text-slate-900 truncate ml-2">{{ fp.commission_percent ?? '-' }}%</span>
                  </div>
                  <div class="flex items-center justify-between min-w-0">
                    <span class="text-xs text-slate-500 flex-shrink-0">佣金金额</span>
                    <span class="text-xs text-slate-900 truncate ml-2 text-red-600">{{ fp.commission_amount }} RUB</span>
                  </div>
                  <div class="flex items-center justify-between min-w-0">
                    <span class="text-xs text-slate-500 flex-shrink-0">卖家结算</span>
                    <span class="text-xs text-slate-900 truncate ml-2 font-medium text-green-600">{{ fp.payout }} RUB</span>
                  </div>
                  <div class="flex items-center justify-between min-w-0">
                    <span class="text-xs text-slate-500 flex-shrink-0">总折扣金额</span>
                    <span class="text-xs text-slate-900 truncate ml-2">{{ fp.total_discount_value }} RUB</span>
                  </div>
                  <div class="flex items-center justify-between min-w-0">
                    <span class="text-xs text-slate-500 flex-shrink-0">总折扣百分比</span>
                    <span class="text-xs text-slate-900 truncate ml-2">{{ fp.total_discount_percent ?? '-' }}%</span>
                  </div>
                </template>
              </div>
            </div>

            <!-- ========== 6. 取消信息 ========== -->

            <div v-if="selectedOrder.raw?.cancellation?.cancel_reason_id && selectedOrder.raw.cancellation.cancel_reason_id !== 0"
                 class="bg-red-50 rounded-lg border border-red-200 p-4">
              <h4 class="text-[13px] font-semibold text-red-700 flex items-center mb-3">
                <span class="w-1 h-4 bg-red-500 rounded mr-2"></span>
                取消信息
              </h4>
              <div class="grid grid-cols-2 gap-x-10 gap-y-2.5">
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-red-600 flex-shrink-0">取消原因</span>
                  <span class="text-xs text-red-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.cancellation?.cancel_reason) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-red-600 flex-shrink-0">原因ID</span>
                  <span class="text-xs text-red-900 truncate ml-2">{{ selectedOrder.raw?.cancellation?.cancel_reason_id || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-red-600 flex-shrink-0">取消类型</span>
                  <span class="text-xs text-red-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.cancellation?.cancellation_type) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-red-600 flex-shrink-0">发货后取消</span>
                  <span class="text-xs text-red-900 truncate ml-2">{{ selectedOrder.raw?.cancellation?.cancelled_after_ship ? '是' : '否' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-red-600 flex-shrink-0">发起方</span>
                  <span class="text-xs text-red-900 truncate ml-2">{{ formatRawValue(selectedOrder.raw?.cancellation?.cancellation_initiator) || '-' }}</span>
                </div>
                <div class="flex items-center justify-between min-w-0">
                  <span class="text-xs text-red-600 flex-shrink-0">影响取消评分</span>
                  <span class="text-xs text-red-900 truncate ml-2">{{ selectedOrder.raw?.cancellation?.affect_cancellation_rating ? '是' : '否' }}</span>
                </div>
              </div>
            </div>

            <!-- ========== 原始API数据 ========== -->

            <div v-if="selectedOrder.raw" class="bg-white rounded-xl border border-slate-200 p-4">
              <div class="flex items-center justify-between cursor-pointer" @click="showRawData = !showRawData">
                <h4 class="text-[13px] font-semibold text-slate-700 flex items-center">
                  <span class="w-1 h-4 bg-slate-400 rounded mr-2"></span>
                  原始API数据
                </h4>
                <el-icon class="text-slate-400 transition-transform" :class="{ 'rotate-180': showRawData }"><ArrowDown /></el-icon>
              </div>
              <div v-show="showRawData" class="mt-3">
                <pre class="bg-slate-50 text-slate-700 text-[11px] rounded-lg p-4 overflow-x-auto whitespace-pre-wrap max-h-[360px] overflow-y-auto border border-slate-200 text-left">{{ formattedRawOrder }}</pre>
              </div>
            </div>

        </div>
'''

new_lines = new_template.split('\n')
# 确保每行以 \n 结尾
new_lines = [line + '\n' for line in new_lines]

result = lines[:start] + new_lines + lines[end + 1:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(result)

print(f"Done. Replaced {end - start + 1} lines with {len(new_lines)} lines.")
print(f"Total file: {len(result)} lines")
