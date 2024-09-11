let allFiles = {
  images: [],
  documents: [],
  videos: [],
  messages: [],
  others: []
};

let currentPage = 1;
const limit = 10;

let totalProgress = 0;
let totalSteps = 3; // Files, Call logs, and Messages

function updateProgress(increment, stepName) {
  totalProgress += increment;
  const progressPercentage = Math.round((totalProgress / totalSteps) * 100);
  const progressElement = document.getElementById('fetch-progress');
  const progressBar = document.querySelector('.progress-bar');
  
  // Update text progress
  progressElement.textContent = `${stepName} (${progressPercentage}%)`;
  
  // Update lebar progress bar
  progressBar.style.width = `${progressPercentage}%`;

  // console.log(`Progress: ${progressPercentage}% - ${stepName}`);

  if (progressPercentage >= 100) {
    // console.log('All data fetched.');
    progressElement.textContent = 'All data loaded (100%)';
    showLoading(false);
  }
}

function updatePagination(pagination) {
  // Update pagination info di UI (misalnya tombol next/previous)
  document.getElementById('currentPage').textContent = `Page ${pagination.currentPage} of ${pagination.totalPages}`;
  // Atur tombol next dan previous
  document.getElementById('nextPage').disabled = pagination.currentPage >= pagination.totalPages;
  document.getElementById('previousPage').disabled = pagination.currentPage <= 1;
}

// Fungsi untuk menampilkan loading
function showLoading(show) {
  const loadingElement = document.getElementById('loading');
  loadingElement.style.display = show ? 'block' : 'none';
}

// Fungsi untuk menampilkan progres fetching
function fetchProgress() {
  fetch('/files/progress')
    .then(response => response.json())
    .then(data => {
      const progressElement = document.getElementById('fetch-progress');
      progressElement.textContent = `${data.progress}%`;

      if (data.progress < 100) {
        setTimeout(fetchProgress, 500); // Polling setiap 500ms
      } else {
        // console.log('File fetching completed');
      }
    })
    .catch(error => console.error('Error fetching progress:', error));
}

function fetchFileProgress() {
  return new Promise((resolve, reject) => {
    fetch('/files/progress')
      .then(response => response.json())
      .then(data => {
        updateProgress(1); // Menghitung files sebagai satu langkah
        resolve();
      })
      .catch(error => {
        console.error('Error fetching file progress:', error);
        reject();
      });
  });
}

// Fungsi untuk mengambil file dari backend
function fetchFiles() {
  return new Promise((resolve, reject) => {
    showLoading(true);
    fetch('/files')
      .then(response => response.json())
      .then(data => {
        // console.log('Files fetched successfully.');
        allFiles = data;
        showAll(); // Menampilkan semua file
        updateProgress(1, 'Loading All Data ...'); // Setelah files selesai, update progress
        resolve();
      })
      .catch(error => {
        console.error('Error fetching files:', error);
        reject();
      });
  });
}

function setActiveCategory(button) {
  // Hapus kelas aktif dari semua tombol
  document.querySelectorAll('.category-buttons button').forEach(btn => {
    btn.classList.remove('active');
  });

  // Tambahkan kelas aktif ke tombol yang dipilih
  button.classList.add('active');
}

function fetchCallLogs() {
  return new Promise((resolve, reject) => {
    fetch('/logs/fetch', { method: 'POST' })
      .then(response => response.json())
      .then(data => {
        const logs = data.logs;
        const callLogsContainer = document.getElementById('callLogs');
        callLogsContainer.innerHTML = '';

        logs.forEach(log => {
          const logElement = document.createElement('div');
          logElement.classList.add('list-group-item');
          logElement.innerHTML = `
            <p><strong>Number:</strong> ${log.number || 'N/A'}</p>
            <p><strong>Duration:</strong> ${log.duration || 'N/A'} seconds</p>
            <p><strong>Date:</strong> ${new Date(parseInt(log.date)).toLocaleString()}</p>
            <p><strong>Location:</strong> ${log.geocoded_location || 'N/A'}</p>
            <p><strong>Type:</strong> ${getCallType(log.type)}</p>
          `;
          callLogsContainer.appendChild(logElement);
        });

        // console.log('Call logs fetched.');
        updateProgress(1, 'Loading call logs'); // Update progress setelah call logs selesai
        resolve();
      })
      .catch(error => {
        console.error('Error fetching call logs:', error);
        reject();
      });
  });
}
// Helper function to determine the type of the call
function getCallType(type) {
  switch (parseInt(type)) {
    case 1:
      return 'Incoming Call';
    case 2:
      return 'Outgoing Call';
    case 3:
      return 'Missed Call';
    default:
      return 'Unknown Type';
  }
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


// Menggabungkan semua fungsi fetching dengan progress bar
function fetchAllData() {
  showLoading(true);
  totalProgress = 0;

  Promise.all([fetchFiles(), fetchMessages(), fetchCallLogs()])
    .then(() => {
      // console.log('All data fetched successfully.');
      updateProgress(0, 'All data loaded');
    })
    .catch(error => {
      console.error('Error fetching all data:', error);
      showLoading(false);
    });
}

// Panggil fetchAllData saat halaman dimuat
window.onload = function () {
  fetchAllData();
};


// Fungsi untuk mengambil pesan dari backend
function fetchMessages() {
  return new Promise((resolve, reject) => {
    fetch('/logs/messages', { method: 'POST' })
      .then(response => response.json())
      .then(data => {
        const messages = data.messages;
        console.log('Messages:', messages);
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = ''; // Clear previous messages

        messages.forEach(msg => {
          const messageElement = document.createElement('div');
          messageElement.classList.add('list-group-item');
          messageElement.innerHTML = `
            <p><strong>From:</strong> ${msg.from || 'N/A'}</p>
            <p><strong>To:</strong> ${msg.to || 'N/A'}</p>
            <p><strong>Date:</strong> ${new Date(parseInt(msg.date)).toLocaleString()}</p>
            <p><strong>Message:</strong> ${msg.body || 'N/A'}</p>
          `;
          messagesContainer.appendChild(messageElement);
        });

        updateProgress(1); // Setelah messages selesai, increment progress
        resolve();
      })
      .catch(error => {
        console.error('Error fetching messages:', error);
        reject();
      });
  });
}

// Fungsi untuk memulai fetching log panggilan dan pesan
async function fetchLogs() {
  try {
    const response = await fetch('/logs/fetch', { method: 'POST' });
    if (!response.ok) {
      throw new Error('Failed to fetch logs');
    }
    const data = await response.json();  // Pastikan responnya JSON
    console.log('Logs:', data);
  } catch (error) {
    console.error('Error fetching logs:', error);
  }
}

// function showContacts() {
//   fetch('/contacts')
//     .then(response => response.json())
//     .then(data => {
//       const contactsContainer = document.getElementById('contacts');
//       contactsContainer.innerHTML = ''; // Clear previous contacts

//       if (data.contacts.length === 0) {
//         contactsContainer.innerHTML = '<p>No contacts found.</p>';
//       } else {
//         data.contacts.forEach(contact => {
//           const contactElement = document.createElement('div');
//           contactElement.classList.add('list-group-item');
//           contactElement.innerHTML = `
//             <p><strong>Name:</strong> ${contact.name}</p>
//             <p><strong>Phone:</strong> ${contact.phone}</p>
//           `;
//           contactsContainer.appendChild(contactElement);
//         });
//       }

//       // Tampilkan container contacts
//       contactsContainer.style.display = 'block';
//     })
//     .catch(error => console.error('Error fetching contacts:', error));
// }

function showCategory(category) {
  const fileList = document.getElementById('fileList');
  const callLogsContainer = document.getElementById('callLogs');
  const messagesContainer = document.getElementById('messages');
  const contactsContainer = document.getElementById('contacts');
  const appsContainer = document.getElementById('installedApps');
  // const deletedFilesContainer = document.getElementById('deletedFiles');

  // Hide all sections initially
  fileList.style.display = 'none';
  callLogsContainer.style.display = 'none';
  messagesContainer.style.display = 'none';
  contactsContainer.style.display = 'none';
  appsContainer.style.display = 'none';
  // deletedFilesContainer.style.display = 'none';

  if (category === 'apps') {
    fetchInstalledApps();
    appsContainer.style.display = 'block'; // Show installed apps
  } if (category === 'logs') {
    fetchCallLogs();
    callLogsContainer.style.display = 'block'; // Show call logs
  } else if (category === 'messages') {
    fetchMessages();
    messagesContainer.style.display = 'block'; // Show messages
  } else if (category === 'contacts') {
    fetchContacts();
    contactsContainer.style.display = 'block'; // Show contacts
  } else {
    fileList.style.display = 'block'; // Show file list if other category is selected
    const files = allFiles[category] || [];
    fileList.innerHTML = ''; // Clear the file list content

    if (files.length === 0) {
      const div = document.createElement('div');
      div.className = 'text-center';
      div.textContent = 'No files found in this category.';
      fileList.appendChild(div);
      return;
    }

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
}


function fetchMessages() {
  return new Promise((resolve, reject) => {
    fetch('/logs/messages', { method: 'POST' })
      .then(response => response.json())
      .then(data => {
        const messages = data.messages;
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = ''; // Clear previous messages

        messages.forEach(msg => {
          const messageElement = document.createElement('div');
          messageElement.classList.add('list-group-item');
          messageElement.innerHTML = `
            <p><strong>From:</strong> ${msg.from || 'N/A'}</p>
            <p><strong>To:</strong> ${msg.to || 'N/A'}</p>
            <p><strong>Date:</strong> ${new Date(parseInt(msg.date)).toLocaleString()}</p>
            <p><strong>Message:</strong> ${msg.body || 'N/A'}</p>
          `;
          messagesContainer.appendChild(messageElement);
        });

        updateProgress(1); // Setelah messages selesai, increment progress
        resolve();
      })
      .catch(error => {
        console.error('Error fetching messages:', error);
        reject();
      });
  });
}


// Fungsi untuk mengambil dan menampilkan log panggilan
async function fetchCallLogs() {
  try {
    const response = await fetch('/logs/fetch', { method: 'POST' });
    if (!response.ok) {
      throw new Error('Failed to fetch logs');
    }

    const data = await response.json();
    const logs = data.logs;

    const callLogsContainer = document.getElementById('callLogs');
    callLogsContainer.innerHTML = ''; // Clear previous logs

    if (logs.length === 0) {
      callLogsContainer.innerHTML = '<p>No call logs found.</p>';
      return;
    }

    // Loop through each log and append to the container
    logs.forEach(log => {
      const logElement = document.createElement('div');
      logElement.classList.add('list-group-item');
      logElement.innerHTML = `
        <p><strong>Name:</strong> ${log.name || 'Contact is not saved'}</p>
        <p><strong>Number:</strong> ${log.number || 'N/A'}</p>
        <p><strong>Duration:</strong> ${log.duration || 'N/A'} seconds</p>
        <p><strong>Date:</strong> ${new Date(parseInt(log.date)).toLocaleString()}</p>
        <p><strong>Location:</strong> ${log.geocoded_location || 'N/A'}</p>
        <p><strong>Type:</strong> ${getCallType(log.type)}</p>
      `;
      callLogsContainer.appendChild(logElement);
    });
  } catch (error) {
    console.error('Error fetching call logs:', error);
  }
}


function applyCallFilter() {
  const filterType = document.getElementById('callFilter').value;
  const searchTerm = document.getElementById('searchCallLogs').value;

  fetch('/logs/fetch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ filterType, searchTerm })
  })
    .then(response => response.json())
    .then(data => {
      const logs = data.logs;
      const callLogsContainer = document.getElementById('callLogs');
      callLogsContainer.innerHTML = ''; // Bersihkan tampilan sebelumnya

      logs.forEach(log => {
        const logElement = document.createElement('div');
        logElement.classList.add('list-group-item');
        logElement.innerHTML = `
          <p><strong>Number:</strong> ${log.number || 'N/A'}</p>
          <p><strong>Duration:</strong> ${log.duration || 'N/A'} seconds</p>
          <p><strong>Date:</strong> ${new Date(parseInt(log.date)).toLocaleString()}</p>
          <p><strong>Type:</strong> ${getCallType(log.type)}</p>
        `;
        callLogsContainer.appendChild(logElement);
      });
    })
    .catch(error => {
      console.error('Error fetching call logs:', error);
    });
}


// Fungsi untuk mendapatkan ikon berdasarkan jenis file
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

function showAll() {
  const fileList = document.getElementById('fileList');
  fileList.innerHTML = ''; // Clear existing items
  let hasFiles = false;

  Object.keys(allFiles).forEach(category => {
    const files = allFiles[category];
    if (files && files.length > 0) {
      hasFiles = true;
      files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'file-list-item';
        div.innerHTML = `
          <i class="${getFileIcon(file.path)} file-icon"></i>
          <div class="file-details">
            <div class="file-path">${file.path.replace(/^\/sdcard\//, '')}</div>
            <div class="file-info">Last Modified: ${file.dateModified || 'N/A'}</div>
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


// Fungsi untuk mendapatkan tombol preview berdasarkan jenis file
function getPreviewButton(filePath) {
  if (filePath.match(/\.(jpg|jpeg|png|gif|mp4|mkv|avi|pdf|docx|txt)$/i)) {
    return `<button class="btn btn-primary btn-sm" onclick="previewFile('${filePath}')">Preview</button>`;
  }
  return ''; // Tidak ada tombol preview untuk tipe file yang tidak didukung
}
function previewFile(filePath) {
  const previewContent = document.getElementById('previewContent');
  const fileDetails = document.getElementById('fileDetails');
  previewContent.innerHTML = ''; // Kosongkan konten sebelumnya
  fileDetails.innerHTML = ''; // Kosongkan detail sebelumnya

  // Tampilkan loading indicator
  fileDetails.innerHTML = '<p>Loading file details...</p>';

  // Buat permintaan baru untuk informasi file
  fetch(`/files/file-info?path=${encodeURIComponent(filePath)}`)
    .then(response => response.json())
    .then(fileData => {
      if (!fileData) {
        console.error('File data not found');
        fileDetails.innerHTML = '<p>Error: File details not available</p>';
        return;
      }

      // Buat tampilan detail file
      let detailsHTML = `
        <p><strong>File Path:</strong> ${fileData.path}</p>
        <p><strong>Date Added:</strong> ${fileData.dateAdded || 'N/A'}</p>
        <p><strong>Date Modified:</strong> ${fileData.dateModified || 'N/A'}</p>
      `;

      // Jika geolocation ada, tambahkan link ke Google Maps dan iframe map
      if (fileData.geolocation && fileData.geolocation.latitude !== 'N/A' && fileData.geolocation.longitude !== 'N/A') {
        const googleMapsLink = `https://www.google.com/maps?q=${fileData.geolocation.latitude},${fileData.geolocation.longitude}`;
        detailsHTML += `
          <p><strong>Geolocation:</strong> 
            <a href="${googleMapsLink}" target="_blank">View on Google Maps</a>
          </p>
          <iframe
            width="100%"
            height="300"
            frameborder="0" 
            style="border:0"
            src="https://www.google.com/maps/embed/v1/view?key=YOUR_GOOGLE_MAPS_API_KEY&center=${fileData.geolocation.latitude},${fileData.geolocation.longitude}&zoom=15" allowfullscreen>
          </iframe>
        `;
      } else {
        detailsHTML += `
          <p><strong>Geolocation:</strong> N/A</p>
        `;
      }

      fileDetails.innerHTML = detailsHTML;

      // Tambahkan konten ke modal berdasarkan tipe file
      if (filePath.match(/\.(jpg|jpeg|png|gif)$/i)) {
        previewContent.innerHTML = `
          <img src="/files/file?path=${encodeURIComponent(filePath)}" class="file-preview" alt="Image Preview">
        `;
      } else if (filePath.match(/\.(mp4|mkv|avi)$/i)) {
        previewContent.innerHTML = `
          <video controls class="file-preview">
            <source src="/files/file?path=${encodeURIComponent(filePath)}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
        `;
      } else {
        previewContent.innerHTML = `
          <p>No preview available for this file type.</p>
        `;
      }

      // Tampilkan modal
      $('#previewModal').modal('show');
    })
    .catch(error => {
      console.error('Error fetching file details:', error);
      fileDetails.innerHTML = '<p>Error: Failed to fetch file details</p>';
    });
}

function fetchDeletedFiles() {
  return new Promise((resolve, reject) => {
    fetch('/files')
      .then(response => response.json())
      .then(data => {
        const deletedFilesContainer = document.getElementById('deletedFiles');
        deletedFilesContainer.innerHTML = ''; // Clear previous content

        const deletedFiles = data.deletedFiles || [];

        if (deletedFiles.length === 0) {
          deletedFilesContainer.innerHTML = '<p>No deleted files found.</p>';
        } else {
          deletedFiles.forEach(file => {
            const fileElement = document.createElement('div');
            fileElement.classList.add('file-list-item');
            fileElement.innerHTML = `
              <i class="${getFileIcon(file.path)} file-icon"></i>
              <div class="file-details">
                <div class="file-path">${file.path.replace(/^\/sdcard\//, '')}</div>
                <div class="file-info">Last Modified: ${file.timestamp || 'Unknown'}</div>
              </div>
              ${getPreviewButton(file.path)}
            `;
            deletedFilesContainer.appendChild(fileElement);
          });
        }
        resolve();
      })
      .catch(error => {
        console.error('Error fetching deleted files:', error);
        reject();
      });
  });
}

// Fungsi untuk mengambil daftar aplikasi dari backend
function fetchInstalledApps() {
  return new Promise((resolve, reject) => {
    fetch('/apps/installed-apps', { method: 'POST' })
      .then(response => response.json())
      .then(data => {
        const appsContainer = document.getElementById('installedApps');
        appsContainer.innerHTML = ''; // Kosongkan daftar aplikasi sebelumnya

        if (data.apps.length === 0) {
          appsContainer.innerHTML = '<p>No installed apps found.</p>';
        } else {
          data.apps.forEach(app => {
            const appElement = document.createElement('div');
            appElement.classList.add('list-group-item');
            appElement.innerHTML = `
              <p><strong>Package Name:</strong> ${app.packageName}</p>
            `;
            appsContainer.appendChild(appElement);
          });
        }

        resolve();
      })
      .catch(error => {
        console.error('Error fetching installed apps:', error);
        reject();
      });
  });
}

function fetchContacts() {
  fetch('/contacts')
    .then(response => response.json())
    .then(data => {
      const contactsContainer = document.getElementById('contacts');
      contactsContainer.innerHTML = ''; // Clear previous contacts

      if (data.contacts.length === 0) {
        contactsContainer.innerHTML = '<p>No contacts found.</p>';
      } else {
        data.contacts.forEach(contact => {
          const contactElement = document.createElement('div');
          contactElement.classList.add('list-group-item');
          contactElement.innerHTML = `
            <p><strong>Name:</strong> ${contact.name}</p>
            <p><strong>Phone:</strong> ${contact.phone}</p>
          `;
          contactsContainer.appendChild(contactElement);
        });
      }

      // Show the contacts container
      contactsContainer.style.display = 'block';
    })
    .catch(error => console.error('Error fetching contacts:', error));
}

// Fungsi untuk mengambil daftar aplikasi dari backend
function fetchInstalledApps() {
  return new Promise((resolve, reject) => {
    fetch('/apps/installed-apps', { method: 'POST' })
      .then(response => response.json())
      .then(data => {
        const appsContainer = document.getElementById('installedApps');
        appsContainer.innerHTML = ''; // Kosongkan daftar aplikasi sebelumnya

        if (data.apps.length === 0) {
          appsContainer.innerHTML = '<p>No installed apps found.</p>';
        } else {
          data.apps.forEach(app => {
            const appElement = document.createElement('div');
            appElement.classList.add('list-group-item');
            appElement.innerHTML = `
              <p><strong>Package Name:</strong> ${app.packageName}</p>
            `;
            appsContainer.appendChild(appElement);
          });
        }

        resolve();
      })
      .catch(error => {
        console.error('Error fetching installed apps:', error);
        reject();
      });
  });
}



// Fetch files and logs on page load
window.onload = function () {
  fetchDeviceInfo();
  fetchFiles();
  fetchLogs();
  fetchAllData();
  fetchInstalledApps();
  fetchContacts();
};
