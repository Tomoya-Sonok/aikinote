"use client";

import { X } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { useToast } from "@/contexts/ToastContext";
import styles from "./PushNotificationSetting.module.css";

interface PushNotificationSettingProps {
  locale: string;
}

interface Reminder {
  id?: string;
  time: string;
  days_of_week: number[];
  _isNew?: boolean;
  _deleted?: boolean;
}

interface NotificationPreferences {
  notify_favorite: boolean;
  notify_reply: boolean;
  notify_reply_to_thread: boolean;
  reminder_enabled: boolean;
  reminders: Reminder[];
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function PushNotificationSetting({
  locale,
}: PushNotificationSettingProps) {
  const t = useTranslations();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);

  // 初期値ロード
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const res = await fetch("/api/notification-preferences");
        if (res.ok) {
          const data = await res.json();
          setPreferences({
            notify_favorite: data.notify_favorite ?? true,
            notify_reply: data.notify_reply ?? true,
            notify_reply_to_thread: data.notify_reply_to_thread ?? true,
            reminder_enabled: data.reminder_enabled ?? false,
            reminders: (data.reminders ?? []).map(
              (r: { id: string; time: string; days_of_week: number[] }) => ({
                id: r.id,
                time: r.time,
                days_of_week: r.days_of_week,
              }),
            ),
          });
        } else {
          // デフォルト値を設定
          setPreferences({
            notify_favorite: true,
            notify_reply: true,
            notify_reply_to_thread: true,
            reminder_enabled: false,
            reminders: [],
          });
        }
      } catch {
        setPreferences({
          notify_favorite: true,
          notify_reply: true,
          notify_reply_to_thread: true,
          reminder_enabled: false,
          reminders: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const updatePreference = useCallback(
    <K extends keyof NotificationPreferences>(
      key: K,
      value: NotificationPreferences[K],
    ) => {
      setPreferences((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    [],
  );

  const updateReminder = useCallback(
    (index: number, updates: Partial<Reminder>) => {
      setPreferences((prev) => {
        if (!prev) return prev;
        const newReminders = [...prev.reminders];
        newReminders[index] = { ...newReminders[index], ...updates };
        return { ...prev, reminders: newReminders };
      });
    },
    [],
  );

  const addReminder = useCallback(() => {
    setPreferences((prev) => {
      if (!prev || prev.reminders.filter((r) => !r._deleted).length >= 5)
        return prev;
      return {
        ...prev,
        reminders: [
          ...prev.reminders,
          { time: "18:00", days_of_week: [], _isNew: true },
        ],
      };
    });
  }, []);

  const removeReminder = useCallback((index: number) => {
    setPreferences((prev) => {
      if (!prev) return prev;
      const reminder = prev.reminders[index];
      if (reminder._isNew) {
        // 新規作成分はリストから削除
        const newReminders = prev.reminders.filter((_, i) => i !== index);
        return { ...prev, reminders: newReminders };
      }
      // 既存分は削除フラグを付ける
      const newReminders = [...prev.reminders];
      newReminders[index] = { ...newReminders[index], _deleted: true };
      return { ...prev, reminders: newReminders };
    });
  }, []);

  const toggleDay = useCallback(
    (reminderIndex: number, day: number) => {
      if (!preferences) return;
      const reminder = preferences.reminders[reminderIndex];
      const days = reminder.days_of_week.includes(day)
        ? reminder.days_of_week.filter((d) => d !== day)
        : [...reminder.days_of_week, day];
      updateReminder(reminderIndex, { days_of_week: days });
    },
    [preferences, updateReminder],
  );

  const handleSave = async () => {
    if (!preferences) return;
    setSaving(true);

    try {
      // 1. ソーシャル通知設定 + リマインダー有効/無効を保存
      const putRes = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notify_favorite: preferences.notify_favorite,
          notify_reply: preferences.notify_reply,
          notify_reply_to_thread: preferences.notify_reply_to_thread,
          reminder_enabled: preferences.reminder_enabled,
        }),
      });

      if (!putRes.ok) throw new Error("Failed to save preferences");

      // 2. リマインダーの CRUD
      const reminderPromises: Promise<Response>[] = [];

      for (const reminder of preferences.reminders) {
        if (reminder._deleted && reminder.id) {
          // 削除
          reminderPromises.push(
            fetch(`/api/notification-preferences/reminders/${reminder.id}`, {
              method: "DELETE",
            }),
          );
        } else if (reminder._isNew && !reminder._deleted) {
          // 新規作成
          reminderPromises.push(
            fetch("/api/notification-preferences/reminders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                time: reminder.time,
                days_of_week: reminder.days_of_week,
              }),
            }),
          );
        } else if (!reminder._deleted && reminder.id) {
          // 更新
          reminderPromises.push(
            fetch(`/api/notification-preferences/reminders/${reminder.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                time: reminder.time,
                days_of_week: reminder.days_of_week,
              }),
            }),
          );
        }
      }

      await Promise.all(reminderPromises);

      // 保存後にリロードして最新状態を反映
      const refreshRes = await fetch("/api/notification-preferences");
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setPreferences({
          notify_favorite: data.notify_favorite ?? true,
          notify_reply: data.notify_reply ?? true,
          notify_reply_to_thread: data.notify_reply_to_thread ?? true,
          reminder_enabled: data.reminder_enabled ?? false,
          reminders: (data.reminders ?? []).map(
            (r: { id: string; time: string; days_of_week: number[] }) => ({
              id: r.id,
              time: r.time,
              days_of_week: r.days_of_week,
            }),
          ),
        });
      }

      showToast(t("pushNotification.saved"), "success");
    } catch {
      showToast("保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MinimalLayout
        headerTitle={t("pushNotification.title")}
        backHref={`/${locale}/mypage`}
      >
        <div className={styles.loading}>読み込み中...</div>
      </MinimalLayout>
    );
  }

  if (!preferences) return null;

  const activeReminders = preferences.reminders.filter((r) => !r._deleted);

  return (
    <MinimalLayout
      headerTitle={t("pushNotification.title")}
      backHref={`/${locale}/mypage`}
    >
      <div className={styles.container}>
        {/* ソーシャル通知セクション */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>
            {t("pushNotification.socialSection")}
          </h2>

          <ToggleRow
            label={t("pushNotification.notifyFavorite")}
            description={t("pushNotification.notifyFavoriteDescription")}
            checked={preferences.notify_favorite}
            onChange={(v) => updatePreference("notify_favorite", v)}
          />

          <ToggleRow
            label={t("pushNotification.notifyReply")}
            description={t("pushNotification.notifyReplyDescription")}
            checked={preferences.notify_reply}
            onChange={(v) => updatePreference("notify_reply", v)}
          />

          <ToggleRow
            label={t("pushNotification.notifyReplyToThread")}
            description={t("pushNotification.notifyReplyToThreadDescription")}
            checked={preferences.notify_reply_to_thread}
            onChange={(v) => updatePreference("notify_reply_to_thread", v)}
          />
        </div>

        {/* 稽古リマインダーセクション */}
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>
            {t("pushNotification.reminderSection")}
          </h2>

          <ToggleRow
            label={t("pushNotification.reminderEnabled")}
            description={t("pushNotification.reminderDescription")}
            checked={preferences.reminder_enabled}
            onChange={(v) => updatePreference("reminder_enabled", v)}
          />

          {preferences.reminder_enabled && (
            <>
              {preferences.reminders.map((reminder, index) => {
                if (reminder._deleted) return null;
                return (
                  <div
                    key={reminder.id ?? `new-${index}`}
                    className={styles.reminderCard}
                  >
                    <div className={styles.reminderHeader}>
                      <span className={styles.reminderTimeLabel}>
                        {t("pushNotification.reminderTime")}
                      </span>
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => removeReminder(index)}
                        aria-label={t("pushNotification.removeReminder")}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <input
                      type="time"
                      step={300}
                      className={styles.timeInput}
                      value={reminder.time}
                      onChange={(e) =>
                        updateReminder(index, { time: e.target.value })
                      }
                    />

                    <span className={styles.daysLabel}>
                      {t("pushNotification.reminderDays")}
                    </span>
                    <div className={styles.daysRow}>
                      {DAY_KEYS.map((dayKey, dayIndex) => (
                        <button
                          key={dayKey}
                          type="button"
                          className={`${styles.dayChip} ${
                            reminder.days_of_week.includes(dayIndex)
                              ? styles.selected
                              : ""
                          }`}
                          onClick={() => toggleDay(index, dayIndex)}
                        >
                          {t(`pushNotification.days.${dayKey}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {activeReminders.length < 5 ? (
                <button
                  type="button"
                  className={styles.addReminderButton}
                  onClick={addReminder}
                >
                  {t("pushNotification.addReminder")}
                </button>
              ) : (
                <p className={styles.limitNote}>
                  {t("pushNotification.reminderLimit")}
                </p>
              )}
            </>
          )}
        </div>

        {/* 保存ボタン */}
        <button
          type="button"
          className={styles.saveButton}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t("pushNotification.saving") : t("pushNotification.save")}
        </button>
      </div>
    </MinimalLayout>
  );
}

/* --- トグルスイッチ サブコンポーネント --- */
interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className={styles.toggleRow}>
      <div className={styles.toggleLabel}>
        <span className={styles.toggleLabelText}>{label}</span>
        <span className={styles.toggleDescription}>{description}</span>
      </div>
      <div className={styles.toggleWrapper}>
        <input
          type="checkbox"
          className={styles.toggleInput}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={`${styles.toggle} ${checked ? styles.active : ""}`}
          onClick={() => onChange(!checked)}
          role="switch"
          aria-checked={checked}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange(!checked);
            }
          }}
        >
          <div className={styles.toggleKnob} />
        </div>
      </div>
    </div>
  );
}
