import type { Meta, StoryObj } from '@storybook/nextjs';
import { TrainingCard } from './TrainingCard';

const meta: Meta<typeof TrainingCard> = {
  title: 'Molecules/TrainingCard',
  component: TrainingCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    onEdit: { action: 'edit clicked' },
    onDelete: { action: 'delete clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: '1',
    title: 'サンプルトレーニング',
    content: 'これはトレーニングカードのサンプルコンテンツです。長いテキストの場合の表示を確認できます。',
    date: '2024-01-15',
    tags: ['React', 'TypeScript', 'Next.js'],
    onEdit: () => console.log('Edit clicked'),
    onDelete: () => console.log('Delete clicked'),
  },
};

export const NoActions: Story = {
  args: {
    id: '2',
    title: 'アクションなしカード',
    content: '編集・削除ボタンがないトレーニングカードです。',
    date: '2024-01-14',
    tags: ['学習', '基礎'],
  },
};

export const LongContent: Story = {
  args: {
    id: '3',
    title: '長いコンテンツのサンプル',
    content: 'これは非常に長いコンテンツのサンプルです。複数行にわたるテキストがどのように表示されるかを確認するためのものです。改行やレイアウトが適切に処理されることを確認できます。',
    date: '2024-01-13',
    tags: ['UI', 'デザイン', 'レイアウト', 'テスト'],
    onEdit: () => console.log('Edit long content'),
    onDelete: () => console.log('Delete long content'),
  },
};

export const SingleTag: Story = {
  args: {
    id: '4',
    title: 'タグ1つのカード',
    content: 'タグが1つだけのカードです。',
    date: '2024-01-12',
    tags: ['単体'],
    onEdit: () => console.log('Edit single tag'),
    onDelete: () => console.log('Delete single tag'),
  },
};
