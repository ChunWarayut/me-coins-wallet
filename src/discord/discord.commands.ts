/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import {
  Context,
  Options,
  SlashCommand,
  SlashCommandContext,
  Button,
  ButtonContext,
  StringSelect,
  StringSelectContext,
} from 'necord';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, TransactionType, TransactionStatus } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { DonateDto } from './dto/donate.dto';
import * as bcrypt from 'bcrypt';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  GuildMember,
  ChannelType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

const ITEMS_PER_PAGE = 9;

@Injectable()
export class DiscordCommands {
  constructor(private prisma: PrismaService) {}

  @SlashCommand({
    name: 'register',
    description: 'ลงทะเบียนบัญชี Discord ของคุณ',
  })
  public async onRegister(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: RegisterDto,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });
    const hashedPassword = await bcrypt.hash(options.password, 10);

    if (existingUser) {
      await this.prisma.user.update({
        where: { discordId: interaction.user.id },
        data: {
          username: options.username,
          password: hashedPassword,
        },
      });
      return interaction.reply({
        content: 'บัญชี Discord ของคุณได้แก้ไขชื่อผู้ใช้งานและรหัสผ่านแล้ว!',
        ephemeral: true,
      });
    }

    // Generate unique account number
    let accountNumber = Math.floor(
      1000000000 + Math.random() * 9000000000,
    ).toString();
    let isUnique = false;

    while (!isUnique) {
      const existingAccount = await this.prisma.user.findFirst({
        where: {
          accountNumber,
        },
      });
      if (!existingAccount) {
        isUnique = true;
      } else {
        accountNumber = Math.floor(
          1000000000 + Math.random() * 9000000000,
        ).toString();
      }
    }
    await this.prisma.user.create({
      data: {
        discordId: interaction.user.id,
        username: options.username,
        email: `${interaction.user.id}@discord.com`,
        password: hashedPassword,
        avatar: interaction.user.avatarURL() || '',
        role: UserRole.NORMAL,
        accountNumber,
        wallet: {
          create: {
            balance: 0,
          },
        },
      },
    });

    return interaction.reply({
      content: 'บัญชี Discord ของคุณได้ลงทะเบียนแล้ว!',
      ephemeral: true,
    });
  }

  @SlashCommand({
    name: 'balance',
    description: 'ตรวจสอบยอดเงินในกระเป๋าของคุณ',
  })
  public async onBalance(@Context() [interaction]: SlashCommandContext) {
    const user = await this.prisma.user.findUnique({
      where: { discordId: interaction.user.id },
      include: { wallet: true },
    });

    if (!user) {
      return interaction.reply({
        content: 'คุณต้องลงทะเบียนบัญชี Discord ก่อน!',
        ephemeral: true,
      });
    }

    if (!user.wallet) {
      return interaction.reply({
        content: 'คุณยังไม่มีกระเป๋าเงิน!',
        ephemeral: true,
      });
    }

    const wallet = user.wallet as { balance: number };
    return interaction.reply({
      content: `ยอดเงินปัจจุบันของคุณ: ${wallet.balance} coins`,
      ephemeral: true,
    });
  }

  @SlashCommand({
    name: 'gifts',
    description: 'แสดงของขวัญทั้งหมดที่มีในระบบ',
  })
  public async onGifts(@Context() [interaction]: SlashCommandContext) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildStageVoice) {
      return interaction.reply({
        content: 'คำสั่งนี้ใช้ได้เฉพาะในห้อง Voice Stage เท่านั้น',
        ephemeral: true,
      });
    }

    const giftsPage = await this.generateGiftsPage(1);

    return interaction.reply({
      ...giftsPage,
      ephemeral: true,
    });
  }

  private async generateGiftsPage(page: number) {
    const items = await this.prisma.item.findMany({
      orderBy: { price: 'asc' },
    });

    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = items.slice(start, end);

    const embed = new EmbedBuilder()
      .setTitle('🎁 ของขวัญทั้งหมดในระบบ')
      .setDescription(
        'เลือกของขวัญที่ต้องการส่งให้เพื่อนในห้อง Stage Voice! 🎁\nใช้เมนูด้านล่างเพื่อเลือกหน้า',
      )
      .setColor(0x5865f2)
      .setTimestamp()
      .setFooter({ text: `หน้า ${currentPage} จาก ${totalPages}` });

    if (pageItems.length > 0) {
      pageItems.forEach((item) => {
        embed.addFields({
          name: `${item.imageUrl} ${item.name}`,
          value: `**ราคา:** ${item.price} coins`,
          inline: true,
        });
      });
    } else {
      embed.setDescription('ยังไม่มีของขวัญในระบบ');
    }

    const rows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] =
      [];
    for (let i = 0; i < pageItems.length; i += 3) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      const rowItems = pageItems.slice(i, i + 3);
      rowItems.forEach((item) => {
        const button = new ButtonBuilder()
          .setCustomId(`donate_${item.id}`)
          .setLabel(`${item.name}`)
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(item.imageUrl as string);
        row.addComponents(button);
      });
      rows.push(row);
    }

    if (totalPages > 1) {
      const pageOptions = Array.from({ length: totalPages }, (_, i) => {
        const pageNum = i + 1;
        return new StringSelectMenuOptionBuilder()
          .setLabel(`ไปที่หน้า ${pageNum}`)
          .setValue(`gifts_page_${pageNum}`)
          .setEmoji(pageNum === currentPage ? '📍' : '📄')
          .setDefault(pageNum === currentPage);
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('gifts_page_select')
        .setPlaceholder('เลือกหน้าของขวัญ')
        .addOptions(pageOptions);

      const paginationRow =
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          selectMenu,
        );
      rows.push(paginationRow);
    }

    return {
      embeds: [embed],
      components: rows,
    };
  }

  @StringSelect('gifts_page_select')
  public async onGiftsPageSelect(
    @Context() [interaction]: StringSelectContext,
  ) {
    const selectedValue = interaction.values[0];
    const newPage = parseInt(selectedValue.replace('gifts_page_', ''), 10);

    if (isNaN(newPage)) {
      return interaction.update({
        content: 'มีบางอย่างผิดพลาด กรุณาลองใหม่อีกครั้ง',
        embeds: [],
        components: [],
      });
    }

    const giftsPage = await this.generateGiftsPage(newPage);

    return interaction.update(giftsPage);
  }

  @Button('donate_:customId')
  public async onDonateButton(@Context() [interaction]: ButtonContext) {
    // Extract item ID from the button's custom ID
    const customId = interaction.customId;

    // Check if this is a donate button and extract item ID
    if (!customId.startsWith('donate_')) {
      return;
    }

    const itemId = customId.replace('donate_', '');

    if (!itemId) {
      return interaction.reply({
        content: 'ไม่พบข้อมูลของขวัญที่เลือก',
        ephemeral: true,
      });
    }

    // Check if user is in a voice channel
    const member = interaction.member;
    if (!member || !('voice' in member) || !member.voice.channel) {
      return interaction.reply({
        content: 'คุณต้องอยู่ในห้องเสียงก่อนที่จะโดเนทของขวัญ',
        ephemeral: true,
      });
    }

    const voiceChannel = member.voice.channel;

    // Check if it's a stage channel or has a speaker
    let recipientId: string | null = null;

    // For now, we'll use the channel owner as recipient
    // You can enhance this logic based on your specific requirements
    if (voiceChannel.guild) {
      // Get the channel owner or first person in the channel
      const channelMembers = voiceChannel.members;
      if (channelMembers.size > 0) {
        // Get the first member in the channel (you might want to implement more sophisticated logic)
        recipientId = channelMembers.first()?.id || null;
      }
    }

    if (!recipientId) {
      return interaction.reply({
        content: 'ไม่พบผู้รับของขวัญในห้องเสียงนี้',
        ephemeral: true,
      });
    }

    // Get the sender's user and wallet
    const sender = await this.prisma.user.findUnique({
      where: { discordId: interaction.user.id },
      include: { wallet: true },
    });

    if (!sender || !sender.wallet) {
      return interaction.reply({
        content: 'คุณต้องลงทะเบียนและมีกระเป๋าเงินก่อน',
        ephemeral: true,
      });
    }

    // Get the recipient's user
    const recipient = await this.prisma.user.findUnique({
      where: { discordId: recipientId },
    });

    if (!recipient) {
      return interaction.reply({
        content: 'ผู้รับของขวัญยังไม่ได้ลงทะเบียนในระบบ',
        ephemeral: true,
      });
    }

    // Get the item
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return interaction.reply({
        content: 'ไม่พบของขวัญที่เลือก',
        ephemeral: true,
      });
    }

    // Check if sender has enough balance
    if (sender.wallet.balance < item.price) {
      return interaction.reply({
        content: `คุณมีเงินไม่เพียงพอ ต้องการ ${item.price} coins แต่มี ${sender.wallet.balance} coins`,
        ephemeral: true,
      });
    }

    // Create the gift transaction
    try {
      await this.prisma.$transaction(async (prisma) => {
        // Create owned item for recipient
        const ownedItem = await prisma.ownedItem.create({
          data: {
            userId: recipient.id,
            itemId: item.id,
            isGifted: true,
          },
        });

        // Create gift record
        const gift = await prisma.gift.create({
          data: {
            senderId: sender.id,
            recipientId: recipient.id,
            ownedItemId: ownedItem.id,
          },
        });

        // Create transaction record for sender
        await prisma.transaction.create({
          data: {
            amount: -item.price,
            type: TransactionType.GIFT,
            status: TransactionStatus.COMPLETED,
            userId: sender.id,
            walletId: sender.wallet!.id,
            giftId: gift.id,
          },
        });

        // Update sender's balance
        await prisma.wallet.update({
          where: { id: sender.wallet!.id },
          data: { balance: sender.wallet!.balance - item.price },
        });
      });

      const successEmbed = new EmbedBuilder()
        .setTitle('🎁 โดเนทของขวัญสำเร็จ!')
        .setDescription(
          `**${sender.username}** ได้มอบของขวัญให้กับ **<@${recipientId}>**`,
        )
        .setColor(0x57f287) // Green
        .setAuthor({
          name: `From: ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .addFields(
          {
            name: 'ของขวัญที่ส่ง',
            value: `${item.imageUrl} ${item.name}`,
            inline: true,
          },
          { name: 'ราคา', value: `💰 ${item.price} coins`, inline: true },
        )
        // .setThumbnail(item.imageUrl)
        .setTimestamp()
        .setFooter({
          text: `Me-Coins Wallet | ID: ${interaction.id}`,
          iconURL: interaction.client.user?.displayAvatarURL(),
        });

      return interaction.reply({
        embeds: [successEmbed],
        ephemeral: false,
      });
    } catch (error) {
      console.error('Error creating gift:', error);
      return interaction.reply({
        content: 'เกิดข้อผิดพลาดในการโดเนทของขวัญ',
        ephemeral: true,
      });
    }
  }

  @SlashCommand({
    name: 'donate',
    description: 'โดเนทของขวัญให้กับเจ้าของห้องเสียงหรือผู้พูด',
  })
  public async onDonate(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: DonateDto,
  ) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildStageVoice) {
      return interaction.reply({
        content: 'คำสั่งนี้ใช้ได้เฉพาะในห้อง Voice Stage เท่านั้น',
        ephemeral: true,
      });
    }

    // Check if it's a stage channel or has a speaker
    let recipientId: string | null = null;

    // For now, we'll use the channel owner as recipient
    // You can enhance this logic based on your specific requirements
    if (voiceChannel.guild) {
      // Get the channel owner or first person in the channel
      const channelMembers = voiceChannel.members;
      if (channelMembers.size > 0) {
        // Get the first member in the channel (you might want to implement more sophisticated logic)
        recipientId = channelMembers.first()?.id || null;
      }
    }

    if (!recipientId) {
      return interaction.reply({
        content: 'ไม่พบผู้รับของขวัญในห้องเสียงนี้',
        ephemeral: true,
      });
    }

    // Get the sender's user and wallet
    const sender = await this.prisma.user.findUnique({
      where: { discordId: interaction.user.id },
      include: { wallet: true },
    });

    if (!sender || !sender.wallet) {
      return interaction.reply({
        content: 'คุณต้องลงทะเบียนและมีกระเป๋าเงินก่อน',
        ephemeral: true,
      });
    }

    // Get the recipient's user
    const recipient = await this.prisma.user.findUnique({
      where: { discordId: recipientId },
    });

    if (!recipient) {
      return interaction.reply({
        content: 'ผู้รับของขวัญยังไม่ได้ลงทะเบียนในระบบ',
        ephemeral: true,
      });
    }

    // Get the item
    const item = await this.prisma.item.findUnique({
      where: { id: options.itemId },
    });

    if (!item) {
      return interaction.reply({
        content: 'ไม่พบของขวัญที่เลือก',
        ephemeral: true,
      });
    }

    // Check if sender has enough balance
    if (sender.wallet.balance < item.price) {
      return interaction.reply({
        content: `คุณมีเงินไม่เพียงพอ ต้องการ ${item.price} coins แต่มี ${sender.wallet.balance} coins`,
        ephemeral: true,
      });
    }

    // Create the gift transaction
    try {
      await this.prisma.$transaction(async (prisma) => {
        // Create owned item for recipient
        const ownedItem = await prisma.ownedItem.create({
          data: {
            userId: recipient.id,
            itemId: item.id,
            isGifted: true,
          },
        });

        // Create gift record
        const gift = await prisma.gift.create({
          data: {
            senderId: sender.id,
            recipientId: recipient.id,
            ownedItemId: ownedItem.id,
          },
        });

        // Create transaction record for sender
        await prisma.transaction.create({
          data: {
            amount: -item.price,
            type: TransactionType.GIFT,
            status: TransactionStatus.COMPLETED,
            userId: sender.id,
            walletId: sender.wallet!.id,
            giftId: gift.id,
          },
        });

        // Update sender's balance
        await prisma.wallet.update({
          where: { id: sender.wallet!.id },
          data: { balance: sender.wallet!.balance - item.price },
        });
      });

      const successEmbed = new EmbedBuilder()
        .setTitle('🎁 โดเนทของขวัญสำเร็จ!')
        .setDescription(
          `**${sender.username}** ได้มอบของขวัญให้กับ **<@${recipientId}>**`,
        )
        .setColor(0x57f287) // Green
        .setAuthor({
          name: `From: ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .addFields(
          {
            name: 'ของขวัญที่ส่ง',
            value: `${item.imageUrl} ${item.name}`,
            inline: true,
          },
          { name: 'ราคา', value: `💰 ${item.price} coins`, inline: true },
        )
        .setThumbnail(item.imageUrl)
        .setTimestamp()
        .setFooter({
          text: `Me-Coins Wallet | ID: ${interaction.id}`,
          iconURL: interaction.client.user?.displayAvatarURL(),
        });

      return interaction.reply({
        embeds: [successEmbed],
        ephemeral: false,
      });
    } catch (error) {
      console.error('Error creating gift:', error);
      return interaction.reply({
        content: 'เกิดข้อผิดพลาดในการโดเนทของขวัญ',
        ephemeral: true,
      });
    }
  }

  @SlashCommand({
    name: 'my-gifts',
    description: 'ดูรายการของขวัญทั้งหมดที่คุณได้รับ',
  })
  public async onMyGifts(@Context() [interaction]: SlashCommandContext) {
    const user = await this.prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!user) {
      return interaction.reply({
        content: 'คุณต้องลงทะเบียนก่อนจึงจะสามารถดูของขวัญของคุณได้',
        ephemeral: true,
      });
    }

    const ownedGifts = await this.prisma.ownedItem.findMany({
      where: {
        userId: user.id,
        isGifted: true,
      },
      include: {
        item: true,
        gifts: {
          include: {
            sender: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (ownedGifts.length === 0) {
      return interaction.reply({
        content: 'คุณยังไม่ได้รับของขวัญใดๆ เลย 🎁',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🎁 ของขวัญของฉัน')
      .setDescription(
        `รายการของขวัญทั้งหมดที่ <@${interaction.user.id}> ได้รับ`,
      )
      .setColor(0x5865f2)
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL(),
      });

    ownedGifts.forEach((ownedItem) => {
      // Assuming one gift per owned item for simplicity
      const gift = ownedItem.gifts[0];
      const sender = gift?.sender;
      const senderUsername = sender ? sender.username : 'ไม่พบชื่อผู้ส่ง';
      embed.addFields({
        name: `${ownedItem.item.imageUrl} ${ownedItem.item.name}`,
        value: `ได้รับจาก: **${senderUsername}**\nเมื่อ: <t:${Math.floor(
          ownedItem.createdAt.getTime() / 1000,
        )}:R>`,
        inline: false,
      });
    });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  @SlashCommand({
    name: 'my-inventory',
    description: 'ดูรายการไอเทมทั้งหมดที่คุณมีในครอบครอง',
  })
  public async onMyInventory(@Context() [interaction]: SlashCommandContext) {
    const user = await this.prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!user) {
      return interaction.reply({
        content: 'คุณต้องลงทะเบียนก่อนจึงจะสามารถดูไอเทมของคุณได้',
        ephemeral: true,
      });
    }

    const ownedItems = await this.prisma.ownedItem.findMany({
      where: {
        userId: user.id,
      },
      include: {
        item: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (ownedItems.length === 0) {
      return interaction.reply({
        content: 'คุณยังไม่มีไอเทมใดๆ ในครอบครอง 🎒',
        ephemeral: true,
      });
    }

    const itemCounts = ownedItems.reduce(
      (acc, { item }) => {
        acc[item.id] = acc[item.id] || { ...item, count: 0 };
        acc[item.id].count++;
        return acc;
      },
      {} as Record<
        string,
        {
          id: string;
          name: string;
          description: string | null;
          imageUrl: string;
          price: number;
          count: number;
        }
      >,
    );

    const embed = new EmbedBuilder()
      .setTitle('🎒 ช่องเก็บของของฉัน')
      .setDescription(
        `รายการไอเทมทั้งหมดที่ <@${interaction.user.id}> มีในครอบครอง`,
      )
      .setColor(0x5865f2)
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL(),
      });

    Object.values(itemCounts).forEach((item) => {
      embed.addFields({
        name: `${item.imageUrl} ${item.name}`,
        value: `จำนวน: **${item.count}** ชิ้น`,
        inline: true,
      });
    });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }
}
