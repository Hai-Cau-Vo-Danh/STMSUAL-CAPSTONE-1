import axios from "axios";

// (Đã sửa lỗi //api)
const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, '');
const API_URL = `${BASE_URL}/api`;

const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  if (!token) console.warn("⚠️ No token found. User needs to login.");
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  };
};

// (Hàm getUserId - chúng ta cần nó ở đây)
const getUserId = () => {
    try { 
      const u = localStorage.getItem("user"); 
      return u ? JSON.parse(u)?.user_id : null; 
    }
    catch (e) { 
      console.error("Error getting user ID:", e); 
      return null; 
    }
};


export const workspaceService = {
  // (Tất cả các hàm cũ từ getAllWorkspaces... đến moveCard... giữ nguyên)
  getAllWorkspaces: async () => {
    const response = await axios.get(`${API_URL}/workspaces`, getAuthHeader());
    return response.data;
  },
  getWorkspaceDetail: async (workspaceId) => {
    const response = await axios.get(
      `${API_URL}/workspaces/${workspaceId}`,
      getAuthHeader()
    );
    return response.data;
  },
  createWorkspace: async (workspaceData) => {
    const response = await axios.post(`${API_URL}/workspaces`, workspaceData, getAuthHeader());
    return response.data;
  },
  updateWorkspace: async (workspaceId, updateData) => {
    const response = await axios.put(
      `${API_URL}/workspaces/${workspaceId}`,
      updateData,
      getAuthHeader()
    );
    return response.data;
  },
  deleteWorkspace: async (workspaceId) => {
    const response = await axios.delete(
      `${API_URL}/workspaces/${workspaceId}`,
      getAuthHeader()
    );
    return response.data;
  },
  inviteMember: async (workspaceId, email, role) => {
    const response = await axios.post(
      `${API_URL}/workspaces/${workspaceId}/invite`,
      { email, role },
      getAuthHeader()
    );
    return response.data;
  },
  updateMemberRole: async (workspaceId, memberId, role) => {
    const response = await axios.put(
      `${API_URL}/workspaces/${workspaceId}/members/${memberId}/role`,
      { role },
      getAuthHeader()
    );
    return response.data;
  },
  removeMember: async (workspaceId, memberId) => {
    const response = await axios.delete(
      `${API_URL}/workspaces/${workspaceId}/members/${memberId}`,
      getAuthHeader()
    );
    return response.data;
  },
  addList: async (workspaceId, title) => {
    const response = await axios.post(
      `${API_URL}/workspaces/${workspaceId}/lists`,
      { title },
      getAuthHeader()
    );
    return response.data;
  },
  addCard: async (workspaceId, listId, cardData) => {
    const actualListId = listId.toString().startsWith("list-")
      ? listId.split("-")[1]
      : listId;
    const response = await axios.post(
      `${API_URL}/workspaces/${workspaceId}/lists/${actualListId}/cards`,
      cardData,
      getAuthHeader()
    );
    return response.data;
  },
  updateList: async (workspaceId, listId, title) => {
    const response = await axios.put(
      `${API_URL}/workspaces/${workspaceId}/lists/${listId}`,
      { title },
      getAuthHeader()
    );
    return response.data;
  },
  deleteList: async (workspaceId, listId) => {
    const response = await axios.delete(
      `${API_URL}/workspaces/${workspaceId}/lists/${listId}`,
      getAuthHeader()
    );
    return response.data;
  },
  updateCard: async (workspaceId, cardId, cardData) => {
    const actualCardId = cardId.toString().startsWith("card-")
      ? cardId.split("-")[1]
      : cardId;
    const response = await axios.put(
      `${API_URL}/workspaces/${workspaceId}/cards/${actualCardId}`,
      cardData,
      getAuthHeader()
    );
    return response.data;
  },
  deleteCard: async (workspaceId, cardId) => {
    const actualCardId = cardId.toString().startsWith("card-")
      ? cardId.split("-")[1]
      : cardId;
    const response = await axios.delete(
      `${API_URL}/workspaces/${workspaceId}/cards/${actualCardId}`,
      getAuthHeader()
    );
    return response.data;
  },
  moveCard: async (workspaceId, cardId, toListId, position) => {
    const actualCardId = cardId.toString().startsWith("card-")
      ? cardId.split("-")[1]
      : cardId;
    const actualListId = toListId.toString().startsWith("list-")
      ? toListId.split("-")[1]
      : toListId;
    const response = await axios.put(
      `${API_URL}/workspaces/${workspaceId}/cards/${actualCardId}/move`,
      { list_id: actualListId, position },
      getAuthHeader()
    );
    return response.data;
  },
  getWorkspaceLabels: async (workspaceId) => {
    const response = await axios.get(
      `${API_URL}/workspaces/${workspaceId}/labels`,
      getAuthHeader()
    );
    return response.data;
  },
  createLabel: async (workspaceId, labelData) => {
    const response = await axios.post(
      `${API_URL}/workspaces/${workspaceId}/labels`,
      labelData,
      getAuthHeader()
    );
    return response.data;
  },
  toggleCardLabel: async (cardId, labelId) => {
    const response = await axios.post(
      `${API_URL}/cards/${cardId}/labels`,
      { label_id: labelId },
      getAuthHeader()
    );
    return response.data; 
  },
  getChecklists: async (cardId) => {
    const response = await axios.get(
      `${API_URL}/cards/${cardId}/checklists`,
      getAuthHeader()
    );
    return response.data;
  },
  createChecklist: async (cardId, title) => {
    const response = await axios.post(
      `${API_URL}/cards/${cardId}/checklists`,
      { title },
      getAuthHeader()
    );
    return response.data;
  },
  deleteChecklist: async (checklistId) => {
    const response = await axios.delete(
      `${API_URL}/checklists/${checklistId}`,
      getAuthHeader()
    );
    return response.data;
  },
  createChecklistItem: async (checklistId, title) => {
    const response = await axios.post(
      `${API_URL}/checklists/${checklistId}/items`,
      { title },
      getAuthHeader()
    );
    return response.data;
  },
  updateChecklistItem: async (itemId, updateData) => {
    const response = await axios.put(
      `${API_URL}/checklist-items/${itemId}`,
      updateData,
      getAuthHeader()
    );
    return response.data;
  },
  deleteChecklistItem: async (itemId) => {
    const response = await axios.delete(
      `${API_URL}/checklist-items/${itemId}`,
      getAuthHeader()
    );
    return response.data;
  },
  getCardComments: async (cardId) => {
    const response = await axios.get(
      `${API_URL}/cards/${cardId}/comments`,
      getAuthHeader()
    );
    return response.data;
  },
  postCardComment: async (cardId, content) => {
    const response = await axios.post(
      `${API_URL}/cards/${cardId}/comments`,
      { content },
      getAuthHeader()
    );
    return response.data;
  },
  getMyTasks: async () => {
    const response = await axios.get(
      `${API_URL}/me/tasks`, 
      getAuthHeader()
    );
    return response.data; 
  },
  
  getHostSelectableTasks: async () => {
    const response = await axios.get(
      `${API_URL}/study-room/host-tasks`, 
      getAuthHeader()
    );
    return response.data; 
  },
  
  reorderLists: async (ordered_ids) => {
    const response = await axios.put(
      `${API_URL}/lists/reorder`, 
      { ordered_ids }, 
      getAuthHeader()
    );
    return response.data;
  },
  getCheckInStatus: async () => {
    const response = await axios.get(
      `${API_URL}/me/check-in-status`,
      getAuthHeader()
    );
    return response.data; 
  },
  performCheckIn: async (clientDateString) => {
    const response = await axios.post(
      `${API_URL}/me/check-in`,
      { client_date: clientDateString }, 
      getAuthHeader()
    );
    return response.data; 
  },
  
  // --- API CHO POMODORO ---
  
  getPomodoroHistory: async () => {
    const userId = getUserId();
    if (!userId) throw new Error("Chưa đăng nhập.");
    
    const response = await axios.get(
      `${API_URL}/pomodoro/history?userId=${userId}`,
      getAuthHeader() 
    );
    return response.data;
  },

  savePomodoroSession: async (sessionData) => {
    // sessionData = { userId, startTime, endTime, duration, type, taskId }
    const response = await axios.post(
      `${API_URL}/pomodoro/session`,
      sessionData,
      getAuthHeader()
    );
    return response.data;
  },
  
  getPomodoroStats: async () => {
    const response = await axios.get(
      `${API_URL}/pomodoro/stats`, 
      getAuthHeader()
    );
    return response.data;
  },

  // --- (THÊM MỚI) SHOP SYSTEM ---
  
  // 1. Lấy danh sách hàng hóa và kho đồ
  getShopItems: async () => {
    const response = await axios.get(`${API_URL}/shop`, getAuthHeader());
    return response.data;
  },

  // 2. Mua vật phẩm
  buyShopItem: async (itemId) => {
    const response = await axios.post(
        `${API_URL}/shop/buy`, 
        { item_id: itemId }, 
        getAuthHeader()
    );
    return response.data;
  },

  // 3. Trang bị vật phẩm
  equipShopItem: async (itemId, type) => {
    const response = await axios.post(
        `${API_URL}/shop/equip`, 
        { item_id: itemId, type }, 
        getAuthHeader()
    );
    return response.data;
  }
  // --- (KẾT THÚC PHẦN THÊM MỚI) ---
};