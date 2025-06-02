// Thêm vào đầu script.js
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}
  
const CONFIG = {
  INITIAL_BALANCE: 100000,
  MIN_BET: 1000,
  BET_STEP: 1000,
  COUNTDOWN_TIME: 30
};
  
  let balance = CONFIG.INITIAL_BALANCE;
  let player = "";
  let gameHistory = [];
  let currentBets = [];
  let countdownInterval;
  let remainingTime = CONFIG.COUNTDOWN_TIME;
  
  // Vị trí các chấm trên xúc xắc (đã điều chỉnh)
  const DOT_POSITIONS = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [25, 75], [75, 25], [75, 75]],
    5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
    6: [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]]
  };
  
  // Khởi động game
  function startGame() {
    const nameInput = document.getElementById("playerName");
    player = nameInput.value.trim();
    
    if (!player) {
      alert("Vui lòng nhập tên người chơi!");
      return;
    }
  
    loadGameData();
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("gameScreen").style.display = "block";
    updateBalance();
    setupEventListeners();
    startCountdown();
  }
  
  // Tải dữ liệu game
  function loadGameData() {
    const savedPlayer = localStorage.getItem("playerName");
    const savedBalance = localStorage.getItem("balance");
    const savedHistory = localStorage.getItem("gameHistory");
  
    if (savedPlayer) player = savedPlayer;
    if (savedBalance) balance = parseInt(savedBalance);
    
    try {
      if (savedHistory) gameHistory = JSON.parse(savedHistory) || [];
    } catch (e) {
      console.error("Lỗi khi đọc lịch sử:", e);
      gameHistory = [];
    }
    
    document.getElementById("playerNameDisplay").textContent = player;
    renderGameHistory(); // Đảm bảo render ngay khi load
    }
  
  // lưu dữ liệu game
  function saveGameData() {
    localStorage.setItem("playerName", player);
    localStorage.setItem("balance", balance);
    localStorage.setItem("gameHistory", JSON.stringify(gameHistory)); 
}
  
  // Cập nhật số dư
  function updateBalance() {
    document.getElementById("balance").textContent = balance.toLocaleString("vi-VN");
    saveGameData(); // Lưu dữ liệu để không mất thông tin
}
  
  // Thiết lập sự kiện
  function setupEventListeners() {
    // Nút cược nhanh
    document.querySelectorAll(".quick-btn").forEach(btn => {
      btn.addEventListener("click", function() {
        const amount = parseInt(this.getAttribute("data-amount"));
        document.getElementById("betAmount").value = amount;
      });
    });
    
    // Chọn loại cược
    document.querySelectorAll(".bet-btn").forEach(btn => {
      btn.addEventListener("click", function() {
        this.classList.toggle("active");
      });
    });
    
    // Sửa đổi event listeners
    document.getElementById("betAmount").addEventListener("input", debounce(function() {
      const value = parseInt(this.value);
      if (!isNaN(value)) {
        this.value = Math.max(CONFIG.MIN_BET, 
          Math.round(value / CONFIG.BET_STEP) * CONFIG.BET_STEP);
      }
    }, 500));
  
    // Đặt cược
    document.getElementById("placeBetBtn").addEventListener("click", placeBet);
  
    // Nút đăng xuất
    document.getElementById("logoutBtn").addEventListener("click", logout);
  }
  
  // Hàm logout
  function logout() {
    if (confirm("Bạn có chắc muốn đăng xuất?")) {
      // Xóa dữ liệu local storage
      localStorage.removeItem("playerName");
      localStorage.removeItem("balance");
      localStorage.removeItem("gameHistory");
      
      // Reset game state
      balance = CONFIG.INITIAL_BALANCE;
      player = "";
      gameHistory = []; // Đảm bảo lịch sử được reset
      currentBets = [];
      
      // Hiển thị lại màn hình đăng nhập
      document.getElementById("gameScreen").style.display = "none";
      document.getElementById("loginScreen").style.display = "flex";
      document.getElementById("playerName").value = "";
      
      // Xóa nội dung lịch sử hiển thị trên giao diện
      document.getElementById("history").innerHTML = "";
      document.getElementById("result").textContent = "Chờ kết quả...";
      
      // Dừng bộ đếm thời gian
      clearInterval(countdownInterval);
    }
  }
  
  // Bắt đầu đếm ngược
  function startCountdown() {
    clearInterval(countdownInterval);
    remainingTime = CONFIG.COUNTDOWN_TIME;
    updateTimerDisplay();
    
    countdownInterval = setInterval(() => {
      remainingTime--;
      updateTimerDisplay();
      
      if (remainingTime <= 0) {
        clearInterval(countdownInterval);
        rollDice();
        setTimeout(() => {
          remainingTime = CONFIG.COUNTDOWN_TIME;
          startCountdown();
        }, 5000);
      }
    }, 1000);
  }
  
  // Cập nhật hiển thị đồng hồ
  function updateTimerDisplay() {
    document.getElementById("countdown").textContent = remainingTime;
  }
  
  // Đặt cược
  function placeBet() {
    const betAmountInput = document.getElementById("betAmount");
    let betAmount = parseInt(betAmountInput.value);
  
    // Kiểm tra số tiền hợp lệ
    if (isNaN(betAmount)) {
        showError("Vui lòng nhập số tiền cược hợp lệ!");
        betAmountInput.focus();
        return;
    }
  
    // Làm tròn theo bước cược
    betAmount = Math.round(betAmount / CONFIG.BET_STEP) * CONFIG.BET_STEP;
    betAmountInput.value = betAmount;
  
    if (betAmount < CONFIG.MIN_BET) {
        alert(`Số tiền cược tối thiểu là ${CONFIG.MIN_BET.toLocaleString()} VND!`);
        return;
    }
  
    // Kiểm tra cược lớn
    if (betAmount > balance * 0.5) {
        if (!confirm(`Bạn đang đặt cược ${betAmount.toLocaleString()} VND (${(betAmount / balance * 100).toFixed(0)}% số dư). Tiếp tục?`)) {
            return;
        }
    }
  
    const activeBets = document.querySelectorAll(".bet-btn.active");
  
    if (activeBets.length === 0) {
        alert("Vui lòng chọn ít nhất một loại cược!");
        return;
    }
  
    // Lưu các cược đã chọn
    currentBets = Array.from(activeBets).map(bet => ({
        type: bet.getAttribute("data-type"),
        odds: parseInt(bet.getAttribute("data-odds")),
        amount: betAmount
    }));
  
    // Trừ tiền cược
    const totalBet = betAmount * activeBets.length;
    balance -= totalBet;
    updateBalance();
  
    // Reset các cược đã chọn
    activeBets.forEach(bet => bet.classList.remove("active"));
  
    alert(`Đã đặt cược thành công ${totalBet.toLocaleString()} VND!`);
}
  
  function showError(message) {
    const errorElement = document.createElement("div");
    errorElement.className = "error-message";
    errorElement.textContent = message;
    
    document.body.appendChild(errorElement);
    setTimeout(() => errorElement.remove(), 3000);
  }
  
  // Lắc xúc xắc
  function rollDice() {
    const diceSound = document.getElementById("diceSound");
    if (diceSound) {
        diceSound.play();
    }
    
    const diceElements = document.querySelectorAll(".dice");
    diceElements.forEach(dice => dice.classList.add("shaking"));
    
    setTimeout(() => {
        diceElements.forEach(dice => dice.classList.remove("shaking"));
        
        // Tạo kết quả ngẫu nhiên
        const diceValues = [
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1
        ];
        
        // Hiển thị kết quả xúc xắc
        diceValues.forEach((value, index) => {
            drawDots(diceElements[index], value);
        });
        
        // xử lý kết quả
        processResults(diceValues);
    }, 2000);
}
  
  // vẽ các chấm trên xúc xắc
  function drawDots(diceElement, value){
    diceElement.innerHTML="";
    DOT_POSITIONS[value].forEach(pos => {
      const dot=document.createElement("div");
      dot.className="dot";
      dot.style.left=`${pos[0]}%`;
      dot.style.top=`${pos[1]}%`;
      diceElement.appendChild(dot);
    });
  }
  
  function processResults(diceValues){
    const total=diceValues.reduce((sum, val) => sum + val, 0);
    const isOdd=total % 2 !== 0;
    const isLow=total >= 4 && total <= 10;
    const isHigh=total >= 11 && total <= 17;
    
    let totalWin=0;
    let totalLoss=0;
    let resultMessage=`🎲 Kết quả: ${diceValues.join(" - ")} | Tổng: ${total}\n\n`;

    currentBets.forEach(bet => {
        const win=checkBetResult(bet.type, diceValues, total, isOdd, isLow, isHigh);
        
        if(win){
            const winAmount=bet.amount * bet.odds;
            totalWin+=winAmount;
            resultMessage+=`✅ ${bet.type} (${bet.odds}:1): +${winAmount.toLocaleString()} VND\n`;
        } else{
            totalLoss+=bet.amount; // Tổng tiền thua chỉ để hiển thị
            resultMessage += `❌ ${bet.type}: -${bet.amount.toLocaleString()} VND\n`;
        }
    });

    // Cập nhật số dư
    balance += totalWin; // Chỉ cộng tiền thắng vào số dư
    updateBalance(); // Gọi hàm cập nhật số dư ngay sau khi thay đổi

    // Thêm tổng kết
    resultMessage += `\n💵 Tổng thắng: +${totalWin.toLocaleString()} VND\n`;
    resultMessage += `💸 Tổng thua: -${totalLoss.toLocaleString()} VND\n`;
    resultMessage += `🏦 Số dư mới: ${balance.toLocaleString()} VND`;
    
    // Hiển thị kết quả với hiệu ứng
    showResultWithAnimation(resultMessage, totalWin);
    
    // lưu lịch sử
    saveToHistory({
        dice: diceValues,
        total: total,
        bets: currentBets,
        win: totalWin,
        loss: totalLoss,
        timestamp: new Date().toISOString()
    });
    
    // reset mức cược
    currentBets=[];
}
  
  // kiểm tra kết quả cược
  function checkBetResult(betType, diceValues, total, isOdd, isLow, isHigh) {
    let win = false;
    
    switch(betType) {
        case "odd-low": 
            win = isOdd && isLow;
            break;
        case "even-high":
            win = !isOdd && isHigh; // Kiểm tra xem tổng có lớn hơn hoặc bằng 11 không
            break;
            
        // Cược đôi (pair)
        case "pair-1":
        case "pair-2":
        case "pair-3":
        case "pair-4":
        case "pair-5":
        case "pair-6":
            const pairNumber = parseInt(betType.split("-")[2]);
            win = countPairs(diceValues, pairNumber) >= 2;
            break;
            
        // Cược bộ ba (triple)
        case "triple-1":
            win = diceValues.every(val => val === 1);
            break;
        case "triple-2":
            win = diceValues.every(val => val === 2);
            break;
        case "triple-3":
            win = diceValues.every(val => val === 3);
            break;
        case "triple-4":
            win = diceValues.every(val => val === 4);
            break;
        case "triple-5":
            win = diceValues.every(val => val === 5);
            break;
        case "triple-6":
            win = diceValues.every(val => val === 6);
            break;
        case "any-triple":
            win = diceValues[0] === diceValues[1] && diceValues[1] === diceValues[2];
            break;
            
        // Cược tổng (total)
        case "total-4":
        case "total-5":
        case "total-6":
        case "total-7":
        case "total-8":
        case "total-9":
        case "total-10":
        case "total-11":
        case "total-12":
        case "total-13":
        case "total-14":
        case "total-15":
        case "total-16":
        case "total-17":
            const targetTotal = parseInt(betType.split("-")[1]);
            win = total === targetTotal;
            break;
            
        // Cược bonus
        case "bonus-x2":
            win = Math.random() < 0.1; // 10% cơ hội thắng
            break;
        case "bonus-x10":
            win = Math.random() < 0.05; // 5% cơ hội thắng
            break;
        case "bonus-x50":
            win = Math.random() < 0.01; // 1% cơ hội thắng
            break;
            
        default:
            console.warn(`Unknown bet type: ${betType}`);
            break;
    }
    
    return win;
  }
  
  // Đếm số lần xuất hiện của một số trong cặp
  function countPairs(diceValues, number) {
    return diceValues.filter(val => val === number).length;
  }
  
  // Lưu lịch sử
  function saveToHistory(record) {
    // Đảm bảo bạn có tham số record để sử dụng
    gameHistory.unshift(record);
    if (gameHistory.length > 20) gameHistory.pop();
    renderGameHistory();
    saveGameData();
}
  
  // Hiển thị lịch sử
  function renderGameHistory() {
    const historyList = document.getElementById("history");
    historyList.innerHTML = "";

    if (gameHistory.length === 0) {
        historyList.innerHTML = '<li class="empty">Chưa có lịch sử cá cược</li>';
        return;
    }

    gameHistory.slice(0, 10).forEach(record => {
      const li = document.createElement("li");
      li.className = record.win > 0 ? "win" : "lose";
      
      const time = new Date(record.timestamp).toLocaleTimeString();
      const dice = record.dice.join("-");
      const result = record.win > 0 
        ? `Thắng +${record.win.toLocaleString()}VND` 
        : `Thua -${record.loss.toLocaleString()}VND`;
      
      li.innerHTML = `
        <span class="time">${time}</span>
        <span class="dice">${dice}</span>
        <span class="total">Tổng ${record.total}</span>
        <span class="result">${result}</span>
      `;
      
      historyList.appendChild(li);
    });
    }
  
    function showResultWithAnimation(message, totalWin) {
      const resultElement = document.getElementById("result");
      resultElement.style.opacity = 0;
      resultElement.textContent = message;
  
      let opacity = 0;
      const fadeIn = setInterval(() => {
          opacity += 0.1;
          resultElement.style.opacity = opacity;
          if (opacity >= 1) clearInterval(fadeIn);
      }, 50);
  
      // sound
      const sound = new Audio(totalWin > 0 ? 'sound/win.mp3' : 'sound/lose.mp3');
      sound.play();
  }
  
  function showPlayerStats() {
    const totalBets = gameHistory.reduce((sum, game) => sum + game.bets.length, 0);
    const totalWins = gameHistory.reduce((sum, game) => sum + (game.win > 0 ? 1 : 0), 0);
    const winRate = totalBets > 0 ? (totalWins / totalBets * 100).toFixed(1) : 0;
    
    const stats = `
      📊 Thống kê cá nhân:
      - Số lượt chơi: ${gameHistory.length}
      - Tổng số cược: ${totalBets}
      - Tỷ lệ thắng: ${winRate}%
      - Số dư cao nhất: ${Math.max(...gameHistory.map(g => g.balance), balance).toLocaleString()}VND
    `;
    
    alert(stats);
  }
  
  // Tự động load game khi có player trong localStorage
  window.onload = function() {
    if (localStorage.getItem("playerName")) {
      document.getElementById("playerName").value = localStorage.getItem("playerName");
      startGame();
    }
  };

 console.log("Saving to history:", record);
 console.log("LocalStorage data:", localStorage.getItem("gameHistory"));