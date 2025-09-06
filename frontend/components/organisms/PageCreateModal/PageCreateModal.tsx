import type { FC } from "react";
import { useState } from "react";
import { TextInput } from "@/components/atoms/TextInput/TextInput";
import { TextArea } from "@/components/atoms/TextArea/TextArea";
import { TagSelection } from "@/components/molecules/TagSelection/TagSelection";
import styles from "./PageCreateModal.module.css";

interface PageCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pageData: PageCreateData) => void;
}

export interface PageCreateData {
  title: string;
  tori: string[];
  uke: string[];
  waza: string[];
  content: string;
  comment: string;
}

// 各カテゴリのタグデータ（Figmaに基づく）
const TORI_TAGS = ["立技", "坐技", "半身半立"];

const UKE_TAGS = [
  "相半身", "逆半身", "片手取り", "諸手取り", "両手取り", 
  "後ろ", "肩取り", "正面打ち", "横面打ち", "突き"
];

const WAZA_TAGS = [
  "一教", "二教", "三教", "四教", "五教", 
  "入身投げ", "四方投げ", "小手返し", "回転投げ"
];

export const PageCreateModal: FC<PageCreateModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  // 現在の日付をデフォルトタイトルとして設定
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState<PageCreateData>({
    title: `${today} `,
    tori: [],
    uke: [],
    waza: [],
    content: "",
    comment: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTagToggle = (category: keyof PageCreateData, tag: string) => {
    setFormData(prev => {
      const currentTags = prev[category] as string[];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag];
      
      return {
        ...prev,
        [category]: newTags,
      };
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "タイトルは必須です";
    }
    
    if (!formData.content.trim()) {
      newErrors.content = "稽古内容は必須です";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
      handleClose();
    }
  };

  const handleClose = () => {
    // フォームリセット
    setFormData({
      title: `${today} `,
      tori: [],
      uke: [],
      waza: [],
      content: "",
      comment: "",
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className={styles.overlay} 
      onClick={handleClose}
      onKeyDown={(e) => e.key === 'Escape' && handleClose()}
    >
      <dialog 
        open
        className={styles.modal} 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>ページ作成</h2>
        </div>

        <div className={styles.content}>
          {/* タイトル */}
          <div className={styles.section}>
            <TextInput
              label="タイトル"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
              error={errors.title}
            />
          </div>

          {/* 取り */}
          <div className={styles.section}>
            <TagSelection
              title="取り"
              tags={TORI_TAGS}
              selectedTags={formData.tori}
              onTagToggle={(tag) => handleTagToggle("tori", tag)}
            />
          </div>

          {/* 受け */}
          <div className={styles.section}>
            <TagSelection
              title="受け"
              tags={UKE_TAGS}
              selectedTags={formData.uke}
              onTagToggle={(tag) => handleTagToggle("uke", tag)}
            />
          </div>

          {/* 技 */}
          <div className={styles.section}>
            <TagSelection
              title="技"
              tags={WAZA_TAGS}
              selectedTags={formData.waza}
              onTagToggle={(tag) => handleTagToggle("waza", tag)}
            />
          </div>

          {/* 稽古内容 */}
          <div className={styles.section}>
            <TextArea
              label="稽古内容"
              required
              value={formData.content}
              onChange={(e) => setFormData(prev => ({...prev, content: e.target.value}))}
              error={errors.content}
              rows={5}
            />
          </div>

          {/* その他・コメント */}
          <div className={styles.section}>
            <TextArea
              label="その他・コメント（補足や動画URL等）"
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({...prev, comment: e.target.value}))}
              rows={3}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={handleClose}>
            キャンセル
          </button>
          <button type="button" className={styles.saveButton} onClick={handleSave}>
            保存
          </button>
        </div>
      </dialog>
    </div>
  );
};
