(function(){
  const form = document.getElementById('registerForm');
  const alertBox = document.getElementById('registerAlert');
  if(!form) return;

  function showAlert(msg, type){
    alertBox.textContent = msg;
    alertBox.className = 'auth-alert show ' + type;
  }

  form.addEventListener('submit', async function(e){
    e.preventDefault();

    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const whatsapp = document.getElementById('regWhatsapp').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;

    if(password !== passwordConfirm){
      showAlert('Password dan konfirmasi password tidak sama.', 'error');
      return;
    }
    if(password.length < 6){
      showAlert('Password minimal 6 karakter.', 'error');
      return;
    }

    const submitBtn = form.querySelector('.auth-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses...';

    const { data, error } = await tiaaSupabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { name: name, whatsapp: whatsapp }
      }
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Daftar Sekarang';

    if(error){
      showAlert(error.message || 'Pendaftaran gagal, silakan coba lagi.', 'error');
      return;
    }

    window.location.href = 'login.html?registered=1';
  });
})();
