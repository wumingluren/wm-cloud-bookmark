// 导入必要的工具函数和类型
import { StorageSerializers } from '@vueuse/core'
import { pausableWatch, toValue, tryOnScopeDispose } from '@vueuse/shared'
import { ref, shallowRef } from 'vue-demi'
import { storage } from 'webextension-polyfill'

// 导入类型定义
import type {
  StorageLikeAsync,
  UseStorageAsyncOptions,
} from '@vueuse/core'
import type { MaybeRefOrGetter, RemovableRef } from '@vueuse/shared'
import type { Ref } from 'vue-demi'
import type { Storage } from 'webextension-polyfill'

// 定义WebExtension存储选项类型，继承自VueUse的异步存储选项
export type WebExtensionStorageOptions<T> = UseStorageAsyncOptions<T>

/**
 * 猜测值的序列化类型
 * @param rawInit 原始值
 * @returns 返回对应的序列化类型字符串
 */
export function guessSerializerType(rawInit: unknown) {
  return rawInit == null
    ? 'any'
    : rawInit instanceof Set
      ? 'set'
      : rawInit instanceof Map
        ? 'map'
        : rawInit instanceof Date
          ? 'date'
          : typeof rawInit === 'boolean'
            ? 'boolean'
            : typeof rawInit === 'string'
              ? 'string'
              : typeof rawInit === 'object'
                ? 'object'
                : Number.isNaN(rawInit)
                  ? 'any'
                  : 'number'
}

/**
 * 实现浏览器扩展存储接口
 * 提供基本的get/set/remove操作
 */
const storageInterface: StorageLikeAsync = {
  // 移除指定key的存储项
  removeItem(key: string) {
    return storage.local.remove(key)
  },

  // 设置指定key的存储项
  setItem(key: string, value: string) {
    return storage.local.set({ [key]: value })
  },

  // 异步获取指定key的存储项
  async getItem(key: string) {
    const storedData = await storage.local.get(key)
    return storedData[key] as string
  },
}

/**
 * 浏览器扩展存储的Composition API
 * 提供响应式的存储访问能力
 * @param key 存储键名
 * @param initialValue 初始值
 * @param options 配置选项
 * @returns 返回响应式引用
 */
export function useWebExtensionStorage<T>(
  key: string,
  initialValue: MaybeRefOrGetter<T>,
  options: WebExtensionStorageOptions<T> = {},
): RemovableRef<T> {
  // 解构配置选项，设置默认值
  const {
    flush = 'pre', // 监听器触发时机
    deep = true, // 是否深度监听
    listenToStorageChanges = true, // 是否监听存储变化
    writeDefaults = true, // 是否写入默认值
    mergeDefaults = false, // 是否合并默认值
    shallow, // 是否使用浅响应
    eventFilter, // 事件过滤器
    onError = (e) => { console.error(e) }, // 错误处理
  } = options

  // 获取原始初始值并猜测序列化类型
  const rawInit: T = toValue(initialValue)
  const type = guessSerializerType(rawInit)

  // 根据配置创建响应式引用
  const data = (shallow ? shallowRef : ref)(initialValue) as Ref<T>
  // 获取序列化器
  const serializer = options.serializer ?? StorageSerializers[type]

  /**
   * 从存储读取数据
   * @param event 存储变化事件(可选)
   */
  async function read(event?: { key: string, newValue: string | null }) {
    if (event && event.key !== key) return

    try {
      // 获取原始存储值
      const rawValue = event ? event.newValue : await storageInterface.getItem(key)
      
      if (rawValue == null) {
        // 如果存储值为空，使用初始值
        data.value = rawInit
        // 如果需要写入默认值且初始值不为空
        if (writeDefaults && rawInit !== null)
          await storageInterface.setItem(key, await serializer.write(rawInit))
      }
      else if (mergeDefaults) {
        // 如果需要合并默认值
        const value = await serializer.read(rawValue) as T
        if (typeof mergeDefaults === 'function')
          data.value = mergeDefaults(value, rawInit)
        else if (type === 'object' && !Array.isArray(value))
          data.value = { ...(rawInit as any), ...(value as any) } as T
        else 
          data.value = value
      }
      else {
        // 直接读取存储值
        data.value = await serializer.read(rawValue) as T
      }
    }
    catch (error) {
      onError(error)
    }
  }

  // 初始读取
  void read()

  /**
   * 写入数据到存储
   */
  async function write() {
    try {
      await (
        data.value == null
          ? storageInterface.removeItem(key) // 值为空时移除
          : storageInterface.setItem(key, await serializer.write(data.value)) // 否则设置值
      )
    }
    catch (error) {
      onError(error)
    }
  }

  // 创建可暂停的监听器
  const { pause: pauseWatch, resume: resumeWatch } = pausableWatch(
    data,
    write,
    { flush, deep, eventFilter },
  )

  // 如果需要监听存储变化
  if (listenToStorageChanges) {
    const listener = async (changes: Record<string, Storage.StorageChange>) => {
      try {
        pauseWatch() // 暂停监听避免循环
        for (const [key, change] of Object.entries(changes)) {
          await read({ key, newValue: change.newValue as string | null })
        }
      }
      finally {
        resumeWatch() // 恢复监听
      }
    }

    // 添加监听器
    storage.onChanged.addListener(listener)

    // 组件卸载时移除监听器
    tryOnScopeDispose(() => {
      storage.onChanged.removeListener(listener)
    })
  }

  // 返回响应式引用
  return data as RemovableRef<T>
}
