// dibuat cek database nya sudah jalan atau belum, kalo udah jalan dihapus saja
// start
import { StoryDatabase } from '../../utils/database';
const db = new StoryDatabase();
console.log(db);
// end
export default class HomePresenter {
  #view;
  #model;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async showReportsListMap() {
    this.#view.showMapLoading();
    try {
      await this.#view.initialMap();
    } catch (error) {
      console.error('showReportsListMap: error:', error);
    } finally {
      this.#view.hideMapLoading();
    }
  }

  async initialGalleryAndMap() {
    this.#view.showLoading();
    try {
      await this.showReportsListMap();
  
      let stories = [];
      const db = new StoryDatabase();
      
      try {
        // Coba ambil data dari API
        const response = await this.#model.getAllReports();
        
        if (response.ok) {
          stories = response.data;
          // Simpan ke IndexedDB
          await Promise.all(stories.map(story => db.saveStory(story)));
        } else {
          // Fallback ke IndexedDB jika API error
          stories = await db.getStories();
        }
      } catch (error) {
        console.error('API Error:', error);
        stories = await db.getStories();
      }
  
      if (stories.length > 0) {
        this.#view.populateReportsList(stories.length ? 'Daftar Cerita' : 'Tidak ada cerita', stories);
      } else {
        this.#view.populateReportsListError('Gagal memuat data');
      }
    } catch (error) {
      console.error('Error:', error);
      this.#view.populateReportsListError(error.message);
    } finally {
      this.#view.hideLoading();
    }
  }

  async postNewReport({description, photo, lat, lon }) {
    this.#view.showSubmitLoadingButton();
    try {
      const response = await this.#model.storeNewReport({
        description,
        photo,
        lat,
        lon
      });
  
      if (!response.ok) {
        console.error('postNewReport: response:', response);
        this.#view.storeFailed(response.message);
        return;
      }
  
      // Kirim notifikasi setelah berhasil
      await this.#sendNotification(description);
      this.#view.storeSuccessfully(response.message);
    } catch (error) {
      console.error('postNewReport: error:', error);
      this.#view.storeFailed(error.message || 'Gagal mengirim cerita');
    } finally {
      this.#view.hideSubmitLoadingButton();
    }
  }

  async #sendNotification(description) {
    try {
      // Cek service worker dan izin notifikasi
      if (!('serviceWorker' in navigator)) return;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      // Daftarkan service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Kirim notifikasi
      registration.showNotification('Story berhasil dibuat', {
        body: `Anda telah membuat story baru dengan deskripsi: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`,
        icon: '/icons/icon-192x192.png',
        vibrate: [200, 100, 200]
      });

    } catch (error) {
      console.error('Gagal mengirim notifikasi:', error);
    }
  }
}