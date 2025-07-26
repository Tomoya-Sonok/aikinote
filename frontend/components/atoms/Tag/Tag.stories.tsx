import type { Meta, StoryObj } from '@storybook/nextjs';
import { Tag } from './Tag';

const meta: Meta<typeof Tag> = {
  title: 'Atoms/Tag',
  component: Tag,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'selected'],
    },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'タグ',
    variant: 'default',
  },
};

export const Selected: Story = {
  args: {
    children: '選択中タグ',
    variant: 'selected',
  },
};

export const Clickable: Story = {
  args: {
    children: 'クリック可能',
    variant: 'default',
    onClick: () => console.log('Tag clicked'),
  },
};

export const LongText: Story = {
  args: {
    children: '長いテキストのタグサンプル',
    variant: 'default',
  },
};
