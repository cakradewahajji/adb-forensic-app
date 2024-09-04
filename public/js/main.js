let allFiles = {
    images: [],
    documents: [],
    videos: [],
    messages: [],
    others: []
  };

  let currentPage = 1;
const limit = 10;

function fetchFiles() {
  showLoading(true);
  // Fetch file dengan parameter pagination (page dan limit)
  fetch(`/files?page=${currentPage}&limit=${limit}`)
    .then(response => response.json())
    .then(data => {
      allFiles = data.data; // Update dengan file yang difetch
      showAll(); // Tampilkan file
      updatePagination(data.pagination); // Update UI pagination
    })
    .catch(error => console.error('Fetch error:', error))
    .finally(() => showLoading(false));
}

function updatePagination(pagination) {
  // Update pagination info di UI (misalnya tombol next/previous)
  document.getElementById('currentPage').textContent = `Page ${pagination.currentPage} of ${pagination.totalPages}`;
  // Atur tombol next dan previous
  document.getElementById('nextPage').disabled = pagination.currentPage >= pagination.totalPages;
  document.getElementById('previousPage').disabled = pagination.currentPage <= 1;
}

document.getElementById('nextPage').addEventListener('click', () => {
  currentPage++;
  fetchFiles();
});

document.getElementById('previousPage').addEventListener('click', () => {
  currentPage--;
  fetchFiles();
});

  
  function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = show ? 'block' : 'none';
  }
  
  async function fetchDeviceInfo() {
    showLoading(true);
    try {
      const response = await fetch('/device-info');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const deviceInfo = await response.json();
      document.getElementById('device-name').textContent = deviceInfo.name;
      document.getElementById('device-os').textContent = deviceInfo.os;
      document.getElementById('device-storage').textContent = `Total: ${deviceInfo.storage.total}, Used: ${deviceInfo.storage.used}, Available: ${deviceInfo.storage.available}`;
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      showLoading(false);
    }
  }
  
  function fetchFiles() {
    showLoading(true);
  
    // Mulai polling untuk progres
    fetchProgress();
  
    fetch('/files')
      .then(response => response.json())
      .then(data => {
        allFiles = data; // Simpan seluruh data ke front-end
        showCategory('images'); // Tampilkan kategori default
      })
      .catch(error => console.error('Fetch error:', error))
      .finally(() => showLoading(false));
  }
  
  
  function setActiveCategory(button) {
    // Hapus kelas aktif dari semua tombol
    document.querySelectorAll('.category-buttons button').forEach(btn => {
      btn.classList.remove('active');
    });
  
    // Tambahkan kelas aktif ke tombol yang dipilih
    button.classList.add('active');
  }
  
  function showCategory(category) {
    // Panggil fungsi ini ketika kategori dipilih
    setActiveCategory(document.querySelector(`[data-category="${category}"]`));
  
    const files = allFiles[category] || [];
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = ''; // Clear existing items
  
    if (files.length === 0) {
      const div = document.createElement('div');
      div.className = 'text-center';
      div.textContent = 'No files found in this category.';
      fileList.appendChild(div);
      return;
    }
  
    // Tampilkan file sesuai kategori
    files.forEach(file => {
      const div = document.createElement('div');
      div.className = 'file-list-item';
      div.innerHTML = `
        <i class="${getFileIcon(file.path)} file-icon"></i>
        <div class="file-details">
          <div class="file-path">${file.path.replace(/^\/sdcard\//, '')}</div>
          <div class="file-info">Last Modified: ${file.timestamp}</div>
        </div>
        ${getPreviewButton(file.path)}
      `;
      fileList.appendChild(div);
    });
  }
  
  
  
  function getFileIcon(filePath) {
    if (filePath.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return 'fas fa-file-image'; // Ikon gambar
    } else if (filePath.match(/\.(mp4|mkv|avi)$/i)) {
      return 'fas fa-file-video'; // Ikon video
    } else if (filePath.match(/\.(pdf|docx|txt)$/i)) {
      return 'fas fa-file-alt'; // Ikon dokumen
    }
    return 'fas fa-file'; // Ikon default
  }
  
  function getPreviewButton(filePath) {
    if (filePath.match(/\.(jpg|jpeg|png|gif|mp4|mkv|avi|pdf|docx|txt)$/i)) {
      return `<button class="btn btn-primary btn-sm" onclick="previewFile('${filePath}')">Preview</button>`;
    }
    return ''; // Tidak ada tombol preview untuk tipe file yang tidak didukung
  }
  
  
  function getPreviewButton(filePath) {
    // Tampilkan tombol preview hanya untuk gambar, video, dan dokumen
    if (filePath.match(/\.(jpg|jpeg|png|gif|mp4|mkv|avi|pdf|docx|txt)$/i)) {
      return `<button class="btn btn-primary btn-sm" onclick="previewFile('${filePath}')">Preview</button>`;
    }
    return ''; // Jangan tampilkan tombol preview untuk folder atau file lainnya
  }
  
  function showAll() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = ''; // Clear existing items
    let hasFiles = false;
  
    Object.keys(allFiles).forEach(category => {
      const files = allFiles[category];
      
      if (files.length > 0) {
        hasFiles = true;
        files.forEach(file => {
          const div = document.createElement('div');
          div.className = 'file-list-item';
          div.innerHTML = `
            <i class="${getFileIcon(file.path)} file-icon"></i>
            <div class="file-details">
              <div class="file-path">${file.path.replace(/^\/sdcard\//, '')}</div>
              <div class="file-info">Last Modified: ${file.timestamp}</div>
            </div>
            ${getPreviewButton(file.path)}
          `;
          fileList.appendChild(div);
        });
      }
    });
  
    if (!hasFiles) {
      const div = document.createElement('div');
      div.className = 'text-center';
      div.textContent = 'No files found.';
      fileList.appendChild(div);
    }
  }
  
  
  
  function previewFile(filePath) {
    const previewContent = document.getElementById('previewContent');
    previewContent.innerHTML = ''; // Clear previous content
  
    const encodedPath = encodeURIComponent(filePath);
  
    if (filePath.match(/\.(jpg|jpeg|png|gif)$/i)) {
      // Preview image
      previewContent.innerHTML = `<img src="/files/file?path=${encodedPath}" class="file-preview" alt="Image Preview">`;
    } else if (filePath.match(/\.(mp4|mkv|avi)$/i)) {
      // Preview video
      previewContent.innerHTML = `
        <video controls class="file-preview">
          <source src="/files/file?path=${encodedPath}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      `;
    } else if (filePath.match(/\.(pdf|docx|txt)$/i)) {
      // Preview document
      previewContent.innerHTML = `<iframe src="/files/file?path=${encodedPath}" class="file-preview" frameborder="0"></iframe>`;
    } else {
      previewContent.innerHTML = '<p>No preview available for this file type.</p>';
    }
  
    // Show the modal
    $('#previewModal').modal('show');
  }

  function fetchProgress() {
    fetch('/files/progress')
      .then(response => response.json())
      .then(data => {
        // Update progress bar di HTML
        document.getElementById('fetch-progress').textContent = `${data.progress}%`;
  
        if (data.progress < 100) {
          setTimeout(fetchProgress, 500); // Poll lagi setelah 500ms
        }
      })
      .catch(error => console.error('Progress fetch error:', error));
  }
  
  // Fetch device info and files on page load
  window.onload = function() {
    fetchDeviceInfo();
    fetchFiles();
  };
  