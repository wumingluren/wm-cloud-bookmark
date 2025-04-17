<script setup lang="ts">
import { ref, watch, defineExpose } from "vue";
import { ElMessage, ElMessageBox, ElTree, ElDialog } from "element-plus"; // 添加 ElTree 导入
import { Close } from "@element-plus/icons-vue";
import * as XLSX from "xlsx";

// 定义属性
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  exportType: {
    type: String as () => "json" | "xlsx",
    default: "json",
  },
});

// 定义事件
const emit = defineEmits(["update:visible", "ok"]);

// 创建本地状态，与 prop 同步
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
});

// 书签文件夹选择相关
const bookmarkFolders = ref<any[]>([]);
const selectedFolders = ref<string[]>([]);
const currentExportType = ref<"json" | "xlsx">("json");

// 监听visible变化
watch(
  () => props.visible,
  (newValue) => {
    if (newValue) {
      getBookmarkFolders();
      // 同步导出类型
      currentExportType.value = props.exportType;
    } else {
      selectedFolders.value = [];
    }
  }
);

// 获取书签文件夹树
async function getBookmarkFolders() {
  try {
    // 检查是否有书签权限
    if (!browser.bookmarks) {
      throw new Error(
        "浏览器书签API不可用，请确保在manifest.json中添加了bookmarks权限"
      );
    }

    // 递归构建文件夹树
    function buildFolderTree(nodes: any[]): any[] {
      const result: any[] = [];

      for (const node of nodes) {
        // 如果没有url字段，说明是文件夹而不是书签
        if (!node.url) {
          const folder = {
            id: node.id,
            label: node.title || "根文件夹",
            children: node.children ? buildFolderTree(node.children) : [],
          };
          result.push(folder);
        }
      }

      return result;
    }

    // 获取书签树
    const bookmarkTree = await browser.bookmarks.getTree();
    bookmarkFolders.value = buildFolderTree(bookmarkTree);
  } catch (error) {
    console.error("获取书签文件夹失败:", error);
    ElMessage.error("获取书签文件夹失败：" + (error as Error).message);
  }
}

// 从选定的文件夹中获取书签
async function getBookmarksFromSelectedFolders() {
  if (selectedFolders.value.length === 0) {
    ElMessage.warning("请至少选择一个文件夹");
    return null;
  }

  try {
    // 定义书签项的接口
    interface BookmarkItem {
      title: string;
      url: string;
    }

    // 递归获取指定文件夹中的所有书签（包括子文件夹）
    async function getBookmarksFromFolder(
      folderId: string
    ): Promise<BookmarkItem[]> {
      const children = await browser.bookmarks.getChildren(folderId);
      let bookmarks: BookmarkItem[] = [];

      for (const child of children) {
        if (child.url) {
          // 是书签
          bookmarks.push({
            title: child.title,
            url: child.url,
          });
        } else {
          // 是文件夹，递归获取其中的书签
          const childBookmarks = await getBookmarksFromFolder(child.id);
          bookmarks = bookmarks.concat(childBookmarks);
        }
      }

      return bookmarks;
    }

    // 从所有选定的文件夹中获取书签
    let allBookmarks: BookmarkItem[] = [];
    for (const folderId of selectedFolders.value) {
      const folderBookmarks = await getBookmarksFromFolder(folderId);
      allBookmarks = allBookmarks.concat(folderBookmarks);
    }

    return allBookmarks;
  } catch (error) {
    console.error("获取书签失败:", error);
    ElMessage.error("获取书签失败：" + (error as Error).message);
    return null;
  }
}

// 确认导出选定文件夹中的书签
async function confirmExportBookmarks() {
  const bookmarks = await getBookmarksFromSelectedFolders();
  if (!bookmarks) return;

  let success = false;

  if (currentExportType.value === "json") {
    success = exportSelectedBookmarksToJson(bookmarks);
  } else {
    success = exportSelectedBookmarksToXlsx(bookmarks);
  }

  if (success) {
    // 导出成功后触发 ok 事件
    emit("ok", {
      type: currentExportType.value,
      count: bookmarks.length,
    });
  }

  closeDialog();
}

// 导出选定文件夹中的书签为JSON
function exportSelectedBookmarksToJson(bookmarks: any[]): boolean {
  try {
    // 创建并下载文件
    const blob = new Blob([JSON.stringify(bookmarks, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `browser-bookmarks-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // ElMessage.success(`浏览器书签导出成功，共 ${bookmarks.length} 条书签`);
    return true;
  } catch (error) {
    ElMessage.error("导出浏览器书签失败：" + (error as Error).message);
    return false;
  }
}

// 导出选定文件夹中的书签为XLSX
function exportSelectedBookmarksToXlsx(bookmarks: any[]): boolean {
  try {
    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 设置表头并准备数据 - 确保只有标题和网址两列
    const headers = [["标题", "网址"]];
    const data = bookmarks.map((bookmark) => [bookmark.title, bookmark.url]);
    const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...data]);

    // 设置列宽
    const wscols = [
      { wch: 40 }, // 标题列宽
      { wch: 80 }, // 网址列宽
    ];
    worksheet["!cols"] = wscols;

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, "浏览器书签");

    // 导出文件
    XLSX.writeFile(
      workbook,
      `browser-bookmarks-${new Date().toISOString().slice(0, 10)}.xlsx`
    );

    // ElMessage.success(`浏览器书签导出成功，共 ${bookmarks.length} 条书签`);
    return true;
  } catch (error) {
    ElMessage.error("导出浏览器书签失败：" + (error as Error).message);
    return false;
  }
}

// 关闭弹窗
function closeDialog() {
  emit("update:visible", false);
  selectedFolders.value = [];
}

// 打开弹窗的方法
function openDialog(type: "json" | "xlsx" = "json") {
  currentExportType.value = type;
  emit("update:visible", true);
}

// 暴露方法给父组件
defineExpose({
  openDialog,
});
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="选择书签文件夹"
    width="50%"
    :close-on-click-modal="false"
  >
    <div v-if="bookmarkFolders.length > 0">
      <p class="mb-4 text-sm text-gray-500">
        请选择要导出书签的文件夹（可多选）：
      </p>
      <el-tree
        :data="bookmarkFolders"
        show-checkbox
        node-key="id"
        default-expand-all
        :check-strictly="true"
        :props="{ children: 'children', label: 'label' }"
        @check="(node, { checkedKeys }) => (selectedFolders = checkedKeys)"
      />
    </div>
    <div v-else class="text-center py-4">
      <p class="text-gray-500">加载书签文件夹中...</p>
    </div>
    <template #footer>
      <div class="flex justify-end space-x-2">
        <button
          @click="closeDialog"
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          取消
        </button>
        <button
          @click="confirmExportBookmarks"
          class="px-4 py-2 bg-primary text-white rounded hover:bg-[#66b1ff]"
        >
          确认导出
        </button>
      </div>
    </template>
  </el-dialog>
</template>
