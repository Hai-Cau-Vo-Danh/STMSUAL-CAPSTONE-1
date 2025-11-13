import React, { useState, useEffect } from 'react';
import { IoClose, IoCart, IoShirt, IoCheckmarkCircle, IoWallet } from 'react-icons/io5';
import { workspaceService } from '../services/workspaceService';
import './ShopModal.css'; // Chúng ta sẽ tạo file css này ở bước 3

const ShopModal = ({ onClose, userInfo, onUpdateUser }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('shop'); // 'shop' hoặc 'inventory'
  const [currentTomatoes, setCurrentTomatoes] = useState(userInfo?.tomatoes || 0);

  useEffect(() => {
    fetchShopData();
  }, []);

  // Cập nhật cà chua nếu userInfo bên ngoài thay đổi
  useEffect(() => {
    if(userInfo) setCurrentTomatoes(userInfo.tomatoes);
  }, [userInfo]);

  const fetchShopData = async () => {
    setLoading(true);
    try {
      const data = await workspaceService.getShopItems();
      setItems(data);
    } catch (err) {
      setError('Không thể tải cửa hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (item) => {
    if (currentTomatoes < item.price) {
      alert("Bạn không đủ Cà chua! Hãy thu thập thêm nhé 🍅");
      return;
    }
    if (!window.confirm(`Bạn muốn mua "${item.name}" với giá ${item.price} 🍅?`)) return;

    try {
      const res = await workspaceService.buyShopItem(item.id);
      setCurrentTomatoes(res.new_tomatoes); // Cập nhật số dư hiển thị
      
      // Cập nhật lại danh sách item (để hiện trạng thái đã mua)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, owned: true } : i));
      
      // Gọi callback để Dashboard cập nhật số cà chua (nếu cần)
      if (onUpdateUser) onUpdateUser({ tomatoes: res.new_tomatoes });
      
      alert("Mua thành công! Vào Kho đồ để trang bị nhé.");
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi mua vật phẩm");
    }
  };

  const handleEquip = async (item) => {
    try {
      const res = await workspaceService.equipShopItem(item.id, item.type);
      
      // Cập nhật thông tin user ở Dashboard để thấy ngay kết quả
      if (onUpdateUser) {
        const updates = {};
        if (item.type === 'frame') updates.equipped_frame_url = res.value;
        if (item.type === 'title') updates.equipped_title = res.value;
        if (item.type === 'name_color') updates.equipped_name_color = res.value;
        onUpdateUser(updates);
      }
      alert(`Đã trang bị ${item.name}!`);
    } catch (err) {
      alert("Lỗi khi trang bị");
    }
  };

  // Lọc items theo tab
  const displayItems = activeTab === 'shop' 
    ? items.filter(i => !i.owned) // Shop: chỉ hiện đồ chưa mua
    : items.filter(i => i.owned); // Inventory: chỉ hiện đồ đã mua

  return (
    <div className="shop-modal-overlay" onClick={onClose}>
      <div className="shop-modal-container" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="shop-header">
          <h2>Cửa hàng Cà chua 🍅</h2>
          <div className="shop-balance">
            <IoWallet className="wallet-icon" />
            <span>{currentTomatoes} 🍅</span>
          </div>
          <button className="close-btn" onClick={onClose}><IoClose /></button>
        </div>

        {/* Tabs */}
        <div className="shop-tabs">
          <button 
            className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`}
            onClick={() => setActiveTab('shop')}
          >
            <IoCart /> Mua sắm
          </button>
          <button 
            className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <IoShirt /> Kho đồ của bạn
          </button>
        </div>

        {/* Content */}
        <div className="shop-content">
          {loading ? <div className="loading">Đang tải...</div> : (
            <>
              {displayItems.length === 0 && (
                <p className="empty-msg">
                  {activeTab === 'shop' ? "Bạn đã mua hết cửa hàng! 😱" : "Kho đồ trống trơn. Hãy mua gì đó đi!"}
                </p>
              )}
              
              <div className="shop-grid">
                {displayItems.map(item => (
                  <div key={item.id} className="shop-card">
                    {/* Preview Area */}
                    <div className="shop-preview" style={{
                      color: item.type === 'name_color' ? item.value : 'inherit',
                      border: item.type === 'frame' && item.value.startsWith('#') ? `3px solid ${item.value}` : '1px solid #eee'
                    }}>
                      {/* Logic hiển thị preview tùy loại */}
                      {item.type === 'name_color' && <span style={{fontWeight:'bold'}}>Tên Của Bạn</span>}
                      {item.type === 'title' && <span className="preview-title">{item.value}</span>}
                      {item.type === 'frame' && <div className="preview-avatar">👤</div>}
                    </div>

                    <div className="shop-info">
                      <h4>{item.name}</h4>
                      <p>{item.description}</p>
                    </div>

                    <div className="shop-action">
                      {activeTab === 'shop' ? (
                        <button className="btn-buy" onClick={() => handleBuy(item)}>
                          Mua {item.price} 🍅
                        </button>
                      ) : (
                        <button className="btn-equip" onClick={() => handleEquip(item)}>
                          Trang bị ngay
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopModal;