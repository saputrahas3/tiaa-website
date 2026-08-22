(function(){
  const form = document.getElementById('loginForm');
  const alertBox = document.getElementById('loginAlert');
  const registeredAlert = document.getElementById('loginRegisteredAlert');
  const formBlock = document.getElementById('loginFormBlock');
  const gate = document.getElementById('memberGate');
  const gateName = document.getElementById('gateName');
  const gateMessage = document.getElementById('gateMessage');
  if(!form) return;

  // show "registration success" banner if redirected from register.html
  const params = new URLSearchParams(window.location.search);
  if(params.get('registered') === '1'){
    registeredAlert.classList.add('show');
  }

  function showError(msg){
    alertBox.textContent = msg;
    alertBox.className = 'auth-alert show error';
  }

  function goToDashboard(){
    window.location.href = 'dashboard-trading-crypto.html';
  }

  function showGate(profile){
    formBlock.style.display = 'none';
    gate.classList.add('show');
    gateName.textContent = profile.name || 'Member';
    gateMessage.textContent = 'Akun kamu sudah masuk, tapi langganan belum aktif. Selesaikan pembayaran salah satu paket, lalu kirim bukti transfer ke admin untuk aktivasi akses dashboard.';
  }

  form.addEventListener('submit', async function(e){
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const submitBtn = form.querySelector('.auth-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses...';

    const { data, error } = await tiaaSupabase.auth.signInWithPassword({ email, password });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Masuk';

    if(error){
      showError('Email atau password salah. Belum punya akun? Daftar dulu di bawah.');
      return;
    }

    const profile = await tiaaGetProfile(data.user.id);

    if(!profile){
      showError('Profil member tidak ditemukan. Hubungi admin untuk bantuan.');
      return;
    }

    if(profile.subscribed){
      goToDashboard();
    }else{
      showGate(profile);
    }
  });
})();
