<template>
  <div class="calendar">
    <div class="calendar-header">
      <button class="prev-month" @click="prevMonth">＜</button>
      <span>{{ year }}年{{ month + 1 }}月</span>
      <button class="next-month" @click="nextMonth">＞</button>
    </div>
    <div class="calendar-grid">
      <div class="calendar-day" v-for="day in days" :key="day" >{{ day }}</div>
      <div
        v-for="blank in firstDayOfWeek"
        :key="'blank-' + blank"
        class="calendar-cell blank"
      ></div>
      <div
        v-for="date in daysInMonth"
        :key="date"
        class="calendar-cell"
        :class="{ selected: isSelected(date) }"
        @click="selectDate(date)"
      >
        {{ date }}
        <div v-if="hasNote(date)" class="note-indicator">●</div>
      </div>
    </div>
    
    <!-- ローディング表示 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>読み込み中...</p>
      </div>
    </div>
    <!-- 既存予定表示 -->
    <div v-if="selected !== null && !showModal" class="calendar-form">
      <div class="form-title">{{ year }}年{{ month + 1 }}月{{ selected }}日</div>
      <div v-if="hasNote(selected)" class="existing-notes">
        <div v-for="(noteItem, index) in getCurrentNote()" :key="noteItem.id || index" class="note-item">
          <div class="note-content">{{ noteItem.note }}</div>
          <div class="note-time" v-if="noteItem.time">{{ formatTime(noteItem.time) }}</div>
          <div class="note-actions">
            <button type="button" @click="openEditModal(noteItem, index)">編集</button>
            <button type="button" @click="deleteNote(noteItem.id, index)" class="delete-btn">削除</button>
          </div>
        </div>
      </div>
      <div v-else class="no-note">
        <p>予定がありません</p>
      </div>
      <div class="form-actions">
        <button type="button" @click="openAddModal" class="add-btn">予定を追加</button>
        <button type="button" @click="closeForm">閉じる</button>
      </div>
    </div>

    <!-- モーダル背景 -->
    <div v-if="showModal" class="modal-backdrop" @click="closeModal">
      <!-- 予定追加モーダル -->
      <div v-if="modalType === 'add'" class="modal" @click.stop>
        <form @submit.prevent="addNote">
          <div class="modal-title">{{ year }}年{{ month + 1 }}月{{ selected }}日 - 予定追加</div>
          <textarea v-model="note" placeholder="予定を入力..." rows="4"></textarea>
          <div class="modal-actions">
            <button type="submit">追加</button>
            <button type="button" @click="closeModal">キャンセル</button>
          </div>
        </form>
      </div>

      <!-- 予定編集モーダル -->
      <div v-if="modalType === 'edit'" class="modal" @click.stop>
        <form @submit.prevent="editNote">
          <div class="modal-title">{{ year }}年{{ month + 1 }}月{{ selected }}日 - 予定編集</div>
          <textarea v-model="editingNote" placeholder="予定を入力..." rows="4"></textarea>
          <div class="modal-actions">
            <button type="submit">保存</button>
            <button type="button" @click="closeModal">キャンセル</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>

import { ref, computed, onMounted, watch } from 'vue'

const apiurl = 'https://script.google.com/macros/s/AKfycbxEi-_3myF-FbnBP0h_JzWhUPaE3Cj4j987vcBnlpj-OWyNg1j5Dex205yQHSbCOOaK7A/exec'

const today = new Date()
const year = ref(today.getFullYear())
const month = ref(today.getMonth())
const selected = ref(null)
const note = ref('')
const editingNote = ref('')
const editingIndex = ref(null) // 編集中の予定のインデックス
const editingId = ref(null) // 編集中の予定のID
const notes = ref({}) // 予定データを保存するオブジェクト
const showModal = ref(false)
const modalType = ref('') // 'add' or 'edit'
const isLoading = ref(false) // ローディング状態

const days = ['日', '月', '火', '水', '木', '金', '土']

const getNotes = async () => {
  // 処理完了までローディンクを表示
  isLoading.value = true
  try {
    // APIからメモを取得
    // {data: [{id:str, date:int(yyyymmdd), time:int(hhmm), note:str}, ...]}
    const response = await fetch(apiurl)
    const data = await response.json()
    
    // notesオブジェクトを更新（同日の複数予定に対応）
    const newNotes = {}
    if (data && data.data) {
      data.data.forEach(item => {
        if (item.date) {
          if (!newNotes[item.date]) {
            newNotes[item.date] = []
          }
          newNotes[item.date].push({
            id: item.id,
            note: item.note,
            time: item.time
          })
        }
      })
    }
    notes.value = newNotes
    return data
  } catch (error) {
    console.error('予定の取得に失敗しました:', error)
    return { data: [] }
  } finally {
    isLoading.value = false
  }
}

const firstDayOfWeek = computed(() => {
  return new Date(year.value, month.value, 1).getDay()
})

const daysInMonth = computed(() => {
  return new Date(year.value, month.value + 1, 0).getDate()
})

function prevMonth() {
  if (month.value === 0) {
    year.value--
    month.value = 11
  } else {
    month.value--
  }
}

function nextMonth() {
  if (month.value === 11) {
    year.value++
    month.value = 0
  } else {
    month.value++
  }
}

function selectDate(date) {
  selected.value = date
  showModal.value = false
  modalType.value = ''
  note.value = ''
  editingNote.value = ''
}

function closeForm() {
  selected.value = null
  note.value = ''
  editingNote.value = ''
  showModal.value = false
  modalType.value = ''
}

function openAddModal() {
  modalType.value = 'add'
  showModal.value = true
  note.value = ''
}

function openEditModal(noteItem, index) {
  modalType.value = 'edit'
  showModal.value = true
  editingNote.value = noteItem.note
  editingIndex.value = index
  editingId.value = noteItem.id
}

function closeModal() {
  showModal.value = false
  modalType.value = ''
  note.value = ''
  editingNote.value = ''
  editingIndex.value = null
  editingId.value = null
}

function getCurrentNote() {
  const dateKey = formatDateKey(selected.value)
  return notes.value[dateKey] || []
}

// 日付キーのフォーマット（YYYYMMDD形式）
function formatDateKey(date) {
  const monthStr = (month.value + 1).toString().padStart(2, '0')
  const dateStr = date.toString().padStart(2, '0')
  return `${year.value}${monthStr}${dateStr}`
}

// 時間をフォーマット（HHMM -> HH:MM）
function formatTime(time) {
  if (!time) return ''
  const timeStr = time.toString().padStart(4, '0')
  return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`
}

// 特定の日付に予定があるかチェック
function hasNote(date) {
  const dateKey = formatDateKey(date)
  return notes.value[dateKey] && notes.value[dateKey].length > 0
}

// ここでAPI送信やローカル保存など可能
async function addNote() {
  isLoading.value = true
  try {
    const dateKey = formatDateKey(selected.value)
    const response = await fetch(apiurl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'add',
        date_info: dateKey,
        note_info: note.value
      })
    })
    
    const result = await response.json()
    
    // ローカルの予定データも更新
    if (!notes.value[dateKey]) {
      notes.value[dateKey] = []
    }
    notes.value[dateKey].push({
      id: result.id || Date.now().toString(), // 一意のIDを生成
      note: note.value,
      time: null
    })
    closeModal()
  } catch (error) {
    console.error('予定の保存に失敗しました:', error)
  } finally {
    isLoading.value = false
  }
}

async function editNote() {
  isLoading.value = true
  try {
    const dateKey = formatDateKey(selected.value)
    await fetch(apiurl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'update',
        id: editingId.value,
        date_info: dateKey,
        note_info: editingNote.value
      })
    })
    
    // ローカルの予定データも更新
    if (notes.value[dateKey] && editingIndex.value !== null) {
      notes.value[dateKey][editingIndex.value].note = editingNote.value
    }
    closeModal()
  } catch (error) {
    console.error('予定の編集に失敗しました:', error)
  } finally {
    isLoading.value = false
  }
}

async function deleteNote(id, index) {
  if (!confirm('この予定を削除しますか？')) {
    return
  }
  
  isLoading.value = true
  try {
    const dateKey = formatDateKey(selected.value)
    await fetch(apiurl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete',
        id: id
      })
    })
    
    // ローカルの予定データからも削除
    if (notes.value[dateKey]) {
      notes.value[dateKey].splice(index, 1)
      if (notes.value[dateKey].length === 0) {
        delete notes.value[dateKey]
      }
    }
    
    // 予定がなくなった場合はフォームを閉じる
    if (!hasNote(selected.value)) {
      closeForm()
    }
  } catch (error) {
    console.error('予定の削除に失敗しました:', error)
  } finally {
    isLoading.value = false
  }
}

function isSelected(date) {
  return selected.value === date
}

// コンポーネントがマウントされた時に予定を取得
onMounted(() => {
  getNotes()
})

// 年月が変更された時に予定を再取得
watch([year, month], () => {
  getNotes()
})
</script>

<style scoped>
.calendar-form {
  margin: 0.5em 1em 1em 1em;
  padding: 1em;
  background: #fff8e1;
  border-radius: 8px;
  box-shadow: 0 2px 8px #0001;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}
.calendar-form .form-title {
  font-weight: bold;
  margin-bottom: 0.5em;
}
.existing-note {
  background: #f5f5f5;
  padding: 1em;
  border-radius: 4px;
  margin-bottom: 0.5em;
}
.existing-notes {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  margin-bottom: 0.5em;
}
.note-item {
  background: #f5f5f5;
  padding: 1em;
  border-radius: 4px;
  border-left: 4px solid #42b883;
}
.note-content {
  margin-bottom: 0.5em;
  white-space: pre-wrap;
  word-break: break-word;
}
.note-time {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 0.5em;
  font-weight: bold;
}
.note-actions {
  display: flex;
  gap: 0.5em;
}
.no-note {
  color: #666;
  font-style: italic;
  text-align: center;
  padding: 1em;
}
.form-actions {
  display: flex;
  gap: 0.5em;
  margin-top: 0.5em;
}
.add-btn {
  background: #42b883 !important;
}
.delete-btn {
  background: #ff4444 !important;
}
.calendar-form button {
  width: fit-content;
  padding: 0.4em 1.2em;
  border: none;
  border-radius: 4px;
  background: #42b883;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.calendar-form button[type="button"]:not(.add-btn):not(.delete-btn) {
  background: #b92121;
}
.calendar-form button:hover {
  opacity: 0.85;
}

/* モーダルスタイル */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal {
  background: white;
  padding: 2em;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  min-width: 400px;
  max-width: 90vw;
}
.modal-title {
  font-weight: bold;
  margin-bottom: 1em;
  font-size: 1.1em;
}
.modal textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.5em;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
  margin-bottom: 1em;
  box-sizing: border-box;
}
.modal-actions {
  display: flex;
  gap: 0.5em;
  justify-content: flex-end;
}
.modal-actions button {
  padding: 0.5em 1.5em;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}
.modal-actions button[type="submit"] {
  background: #42b883;
  color: white;
}
.modal-actions button[type="button"] {
  background: #ccc;
  color: #333;
}
.modal-actions button:hover {
  opacity: 0.85;
}
.calendar {
  min-width: 350px;
  margin: 2em auto;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 1em;
  background: #ffc2c2;
}
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1em;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.calendar-day {
  font-weight: bold;
  text-align: center;
  padding: 0.5em 0;
}
.calendar-cell {
  text-align: center;
  padding: 0.7em 0;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
  color: #222;
  position: relative;
}
.calendar-cell.selected {
  background: #b92121;
  color: #fff;
}
.calendar-cell.blank {
  background: transparent;
  cursor: default;
}
.calendar-cell:hover:not(.blank) {
  background: #42b883;
}
.note-indicator {
  position: absolute;
  top: 2px;
  right: 4px;
  color: #ff6b35;
  font-size: 0.8em;
  font-weight: bold;
}
.next-month,
.prev-month {
  margin: 15px;
}

/* ローディング表示 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.loading-spinner {
  background: white;
  padding: 2em;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1em;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #42b883;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-spinner p {
  margin: 0;
  color: #333;
  font-weight: 500;
}
</style>
