import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Context,
  Options,
  SlashCommand,
  SlashCommandContext,
  Button,
  ButtonContext,
  StringSelect,
  StringSelectContext,
  Modal,
  ModalContext,
} from 'necord';
import { PrismaService } from '../prisma/prisma.service';
import { TransfersService } from '../transfers/transfers.service';
import { PaymentsService } from '../payments/payments.service';
import { DiscordService } from './discord.service';
import { UserRole, TransactionType, TransactionStatus } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { DonateDto } from './dto/donate.dto';
import { TransferDto } from './dto/transfer.dto';
import { BuyPackDto } from './dto/buy-pack.dto';
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
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

const ITEMS_PER_PAGE = 9;

@Injectable()
export class DiscordCommands implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private transfersService: TransfersService,
    private paymentsService: PaymentsService,
    private discordService: DiscordService,
  ) {}

  onModuleInit() {
    // Discord client จะถูก set จาก interaction.client ในแต่ละ interaction
    // ซึ่งจะทำให้ DiscordService สามารถใช้ client ได้
  }

  @SlashCommand({
    name: 'register',
    description: 'ลงทะเบียนบัญชี Discord ของคุณ',
  })
  public async onRegister(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: RegisterDto,
  ) {
    const existingUser = await this.prisma.user.findFirst({
      where: { discordId: interaction.user.id },
    });
    const hashedPassword = await bcrypt.hash(options.password, 10);

    if (existingUser) {
      await this.prisma.user.update({
        where: { id: existingUser.id },
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
    const user = await this.prisma.user.findFirst({
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
    name: 'bank-number',
    description: 'ดูเลขบัญชีธนาคารของคุณ',
  })
  public async onBankNumber(@Context() [interaction]: SlashCommandContext) {
    const user = await this.prisma.user.findFirst({
      where: { discordId: interaction.user.id },
    });

    if (!user) {
      return interaction.reply({
        content: 'คุณต้องลงทะเบียนบัญชี Discord ก่อน!',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🏦 เลขบัญชีธนาคารของคุณ')
      .setDescription(`**เลขบัญชี:** ${user.accountNumber}`)
      .setColor(0x00ff00)
      .setTimestamp()
      .setFooter({ text: 'ใช้เลขบัญชีนี้สำหรับการโอนเงินเข้าบัญชี' });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  }

  @SlashCommand({
    name: 'transfer',
    description: 'โอนเงินไปยังบัญชีอื่น',
  })
  public async onTransfer(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: TransferDto,
  ) {
    try {
      const transfer = await this.transfersService.createTransferFromDiscord(
        interaction.user.id,
        options,
      );

      const embed = new EmbedBuilder()
        .setTitle('✅ การโอนเงินสำเร็จ')
        .setDescription(
          `**จำนวนเงิน:** ${options.amount} coins\n**ไปยัง:** ${transfer.receiver.username} (${transfer.receiver.accountNumber})\n**หมายเหตุ:** ${options.comment || 'ไม่มี'}`,
        )
        .setColor(0x00ff00)
        .setTimestamp()
        .setFooter({ text: `รหัสการโอน: ${transfer.id}` });

      return interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    } catch (error) {
      let errorMessage = 'เกิดข้อผิดพลาดในการโอนเงิน';

      if (error instanceof Error) {
        if (error.message === 'Sender wallet not found') {
          errorMessage = 'คุณต้องลงทะเบียนบัญชี Discord ก่อน!';
        } else if (error.message === 'Receiver account not found') {
          errorMessage = 'ไม่พบเลขบัญชีปลายทางที่ระบุ';
        } else if (error.message === 'Cannot transfer to yourself') {
          errorMessage = 'ไม่สามารถโอนเงินให้ตัวเองได้';
        } else if (error.message === 'Insufficient balance') {
          errorMessage = 'ยอดเงินในกระเป๋าไม่เพียงพอ';
        }
      }

      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ การโอนเงินล้มเหลว')
        .setDescription(errorMessage)
        .setColor(0xff0000)
        .setTimestamp();

      return interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true,
      });
    }
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
    console.log(`Voice Channel Name: ${voiceChannel.name}`);
    console.log(
      `Members in Channel: ${voiceChannel.members.map((member) => member.displayName).join(', ')}`,
    );

    const matchingMember = voiceChannel.members.find(
      (member) =>
        member.displayName ===
        voiceChannel.name.replace('🎩・', '').replace(' ไลฟ์', ''),
    );

    console.log(
      `Matching Member: ${matchingMember ? matchingMember.displayName : 'None'}`,
    );

    if (!matchingMember) {
      return interaction.reply({
        content: 'ไม่พบสมาชิกที่มีชื่อเดียวกับชื่อห้อง',
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
          value: `**ราคา:** ${item.price} Copper`,
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
          // .setLabel(`${item.name}`)
          .setLabel(`${item.price} Copper`)
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

      const matchingMember = voiceChannel.members.find(
        (member) =>
          member.displayName ===
          voiceChannel.name.replace('🎩・', '').replace(' ไลฟ์', ''),
      );

      if (matchingMember) {
        recipientId = matchingMember.id;
      }
    }

    if (!recipientId) {
      return interaction.reply({
        content: 'ไม่พบผู้รับของขวัญในห้องเสียงนี้',
        ephemeral: true,
      });
    }

    // Get the sender's user and wallet
    const sender = await this.prisma.user.findFirst({
      where: { discordId: interaction.user.id },
      include: { wallet: true },
    });

    if (!sender || !sender.wallet) {
      return this.showRegistrationModal([interaction]);
    }

    // Get the recipient's user
    const recipient = await this.prisma.user.findFirst({
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
      return this.showPaymentPage(
        [interaction],
        sender.id,
        item.price,
        sender.wallet.balance,
        `ชำระเงินเพื่อซื้อของขวัญ: ${item.imageUrl} ${item.name}`,
      );
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
          { name: 'ราคา', value: `💰 ${item.price} Copper`, inline: true },
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
    const sender = await this.prisma.user.findFirst({
      where: { discordId: interaction.user.id },
      include: { wallet: true },
    });

    if (!sender || !sender.wallet) {
      return this.showRegistrationModal([interaction]);
    }

    // Get the recipient's user
    const recipient = await this.prisma.user.findFirst({
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
      return this.showPaymentPage(
        [interaction],
        sender.id,
        item.price,
        sender.wallet.balance,
        `ชำระเงินเพื่อซื้อของขวัญ: ${item.imageUrl} ${item.name}`,
      );
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
          { name: 'ราคา', value: `💰 ${item.price} Copper`, inline: true },
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
    const user = await this.prisma.user.findFirst({
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
    const user = await this.prisma.user.findFirst({
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

  private async showPaymentPage(
    context: ButtonContext | SlashCommandContext,
    userId: string,
    requiredAmount: number,
    currentBalance: number,
    description: string,
  ) {
    const [interaction] = context;

    try {
      // คำนวณจำนวนเงินที่ต้องชำระ (เพิ่ม 20% หรืออย่างน้อย 10 Copper)
      const shortage = requiredAmount - currentBalance;

      // ดึงแพ็คทั้งหมดที่พร้อมใช้งาน
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
      const packs = await (this.prisma as any).coinPack.findMany({
        where: { isActive: true },
        orderBy: { packNumber: 'asc' },
      });

      // กรองแพ็คที่ให้ Copper มากกว่าหรือเท่ากับจำนวนที่ขาด
      const suitablePacks = packs.filter(
        (pack: { totalCopper: number }) => pack.totalCopper >= shortage,
      );

      if (suitablePacks.length === 0) {
        // ถ้าไม่มีแพ็คที่เหมาะสม ให้แสดงแพ็คที่ใหญ่ที่สุด
        const largestPack = packs[packs.length - 1];
        if (largestPack) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          return this.showPaymentPageForPack(
            context,
            userId,
            largestPack,
            requiredAmount,
            currentBalance,
            description,
          );
        }
      }

      // สร้าง embed สำหรับแสดงแพ็คให้เลือก
      const embed = new EmbedBuilder()
        .setTitle('💳 เลือกแพ็คสำหรับชำระเงิน')
        .setDescription(
          `**ยอดเงินปัจจุบัน:** ${currentBalance} Copper\n**ต้องการ:** ${requiredAmount} Copper\n**ขาด:** ${shortage} Copper\n\n**กรุณาเลือกแพ็คที่ต้องการชำระ:**`,
        )
        .setColor(0xffd700)
        .setTimestamp()
        .setFooter({
          text: 'เลือกแพ็คที่ให้ Copper มากกว่าหรือเท่ากับจำนวนที่ขาด',
        });

      // เพิ่มข้อมูลแพ็คที่เหมาะสม
      suitablePacks.forEach(
        (pack: {
          packNumber: number;
          price: number;
          totalCopper: number;
          bonus: number;
        }) => {
          embed.addFields({
            name: `แพ็ค ${pack.packNumber} - ${pack.price} บาท`,
            value: `💰 **${pack.totalCopper.toLocaleString()} Copper**\n🎁 โบนัส: ${pack.bonus}%`,
            inline: true,
          });
        },
      );

      // สร้างปุ่มสำหรับแต่ละแพ็ค
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      const packsPerRow = 3;

      for (let i = 0; i < suitablePacks.length; i += packsPerRow) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        const rowPacks = suitablePacks.slice(i, i + packsPerRow);
        rowPacks.forEach((pack: { packNumber: number; price: number }) => {
          const button = new ButtonBuilder()
            .setCustomId(
              `pay_pack_${pack.packNumber}-${userId}-${requiredAmount}-${currentBalance}`,
            )
            .setLabel(`แพ็ค ${pack.packNumber} (${pack.price}฿)`)
            .setStyle(ButtonStyle.Primary);
          row.addComponents(button);
        });
        rows.push(row);
      }
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

      const reply = await interaction.reply({
        embeds: [embed],
        components: rows,
        ephemeral: true,
      });

      // เก็บ message ID และ channel ID ใน payment metadata (จะอัปเดตเมื่อเลือกแพ็ค)
      // Note: ข้อมูลจะถูกอัปเดตใน showPaymentPageForPack เมื่อผู้ใช้เลือกแพ็ค

      return reply;
    } catch (error) {
      console.error('Error showing payment page:', error);
      return interaction.reply({
        content: 'เกิดข้อผิดพลาดในการแสดงหน้าชำระเงิน กรุณาลองใหม่อีกครั้ง',
        ephemeral: true,
      });
    }
  }

  private async showPaymentPageForPack(
    context: ButtonContext | SlashCommandContext,
    userId: string,
    pack: {
      packNumber: number;
      price: number;
      totalCopper: number;
      bonus: number;
    },
    requiredAmount?: number,
    currentBalance?: number,
    description?: string,
  ) {
    const [interaction] = context;

    try {
      // ราคาแพ็คเป็นบาทโดยตรง
      const paymentAmount = pack.price;

      // แปลงเป็นสตางค์ (1 THB = 100 satang)
      const amountInSatang = Math.round(paymentAmount * 100);

      // สร้าง payment intent
      const paymentResult = await this.paymentsService.createPaymentIntent({
        amount: amountInSatang,
        currency: 'thb',
        description:
          description ||
          `ซื้อแพ็ค ${pack.packNumber} - ${pack.totalCopper.toLocaleString()} Copper`,
        metadata: {
          userId,
          packNumber: pack.packNumber.toString(),
          coinsAmount: pack.totalCopper.toString(),
          type: 'coin_pack',
          ...(requiredAmount && { requiredAmount: requiredAmount.toString() }),
          ...(currentBalance && { currentBalance: currentBalance.toString() }),
        },
      });

      // สร้าง embed สำหรับแสดงหน้าชำระเงิน
      const embed = new EmbedBuilder()
        .setTitle(`💰 ซื้อแพ็ค ${pack.packNumber}`)
        .setDescription(
          `**ราคา:** ${paymentAmount} บาท\n**จะได้รับ:** ${pack.totalCopper.toLocaleString()} Copper\n**โบนัส:** ${pack.bonus}%`,
        )
        .setColor(0xffd700)
        .setTimestamp()
        .setFooter({
          text: 'สแกน QR Code หรือคลิกลิงก์เพื่อชำระเงิน',
        });

      // เพิ่ม QR code image ถ้ามี
      if (paymentResult.qr?.imageUrl) {
        embed.setImage(paymentResult.qr.imageUrl);
      }

      // เพิ่ม payment URL
      if (paymentResult.paymentUrl) {
        embed.addFields({
          name: '🔗 ลิงก์ชำระเงิน',
          value: `[คลิกที่นี่เพื่อชำระเงิน](${paymentResult.paymentUrl})`,
        });
      }

      // เพิ่ม QR data ถ้ามี
      if (paymentResult.qr?.data) {
        embed.addFields({
          name: '📱 QR Code Data',
          value: `\`\`\`${paymentResult.qr.data}\`\`\``,
          inline: false,
        });
      }

      // ตั้งค่า Discord client ใน DiscordService เพื่อใช้ในการอัปเดต embed
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.discordService.setClient(interaction.client as any);

      const reply = await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });

      // เก็บ message ID และ channel ID ใน payment metadata เพื่ออัปเดต embed เมื่อชำระเงินสำเร็จ
      if (reply && 'id' in reply) {
        // ดึง payment จากฐานข้อมูลเพื่อเอา metadata เดิมมา merge
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const existingPayment = await this.prisma.payment.findUnique({
          where: {
            stripePaymentIntentId: paymentResult.paymentIntentId,
          },
        });

        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
        const existingMetadata = (existingPayment?.metadata as any) || {};
        const newMetadata = {
          ...existingMetadata,
          messageId: reply.id,
          channelId: interaction.channelId,
          guildId: interaction.guildId,
        };
        /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        await this.prisma.payment.updateMany({
          where: {
            stripePaymentIntentId: paymentResult.paymentIntentId,
          },
          data: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            metadata: newMetadata,
          },
        });
      }

      return reply;
    } catch (error) {
      console.error('Error creating payment:', error);
      return interaction.reply({
        content: 'เกิดข้อผิดพลาดในการสร้างหน้าชำระเงิน กรุณาลองใหม่อีกครั้ง',
        ephemeral: true,
      });
    }
  }

  private showRegistrationModal(context: ButtonContext | SlashCommandContext) {
    const modal = new ModalBuilder()
      .setCustomId('register_modal')
      .setTitle('ลงทะเบียนบัญชี');

    const usernameInput = new TextInputBuilder()
      .setCustomId('register_username')
      .setLabel('ชื่อผู้ใช้งาน')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('กรุณากรอกชื่อผู้ใช้งาน')
      .setRequired(true)
      .setMaxLength(50);

    const passwordInput = new TextInputBuilder()
      .setCustomId('register_password')
      .setLabel('รหัสผ่าน')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('กรุณากรอกรหัสผ่าน')
      .setRequired(true)
      .setMaxLength(100);

    const firstActionRow =
      new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput);
    const secondActionRow =
      new ActionRowBuilder<TextInputBuilder>().addComponents(passwordInput);

    modal.addComponents(firstActionRow, secondActionRow);

    const [interaction] = context;
    return interaction.showModal(modal);
  }

  @Modal('register_modal')
  public async onRegisterModal(@Context() [interaction]: ModalContext) {
    const username = interaction.fields.getTextInputValue('register_username');
    const password = interaction.fields.getTextInputValue('register_password');

    if (!username || !password) {
      return interaction.reply({
        content: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        ephemeral: true,
      });
    }

    try {
      const existingUser = await this.prisma.user.findFirst({
        where: { discordId: interaction.user.id },
      });
      const hashedPassword = await bcrypt.hash(password, 10);

      if (existingUser) {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            username,
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
          username,
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
        content:
          '✅ บัญชี Discord ของคุณได้ลงทะเบียนแล้ว! ตอนนี้คุณสามารถใช้งานได้แล้ว',
        ephemeral: true,
      });
    } catch (error) {
      console.error('Error registering user:', error);
      return interaction.reply({
        content: 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง',
        ephemeral: true,
      });
    }
  }

  @SlashCommand({
    name: 'coin-packs',
    description: 'แสดงแพ็คแลกเปลี่ยน Coin ทั้งหมด',
  })
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  public async onCoinPacks(@Context() [interaction]: SlashCommandContext) {
    const packs = await (this.prisma as any).coinPack.findMany({
      where: { isActive: true },
      orderBy: { packNumber: 'asc' },
    });

    if (packs.length === 0) {
      return interaction.reply({
        content: 'ยังไม่มีแพ็คแลกเปลี่ยน Coin ในระบบ',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('💰 แพ็คแลกเปลี่ยน Coin')
      .setDescription('เลือกแพ็คที่ต้องการซื้อ!')
      .setColor(0xffd700)
      .setTimestamp();

    // แบ่งแพ็คเป็น 2 กลุ่ม (5 แพ็คต่อหน้า)
    const packsPerPage = 5;
    const totalPages = Math.ceil(packs.length / packsPerPage);

    for (let i = 0; i < packs.length && i < packsPerPage; i++) {
      const pack = packs[i];
      const coins = pack.totalCopper; // totalCopper คือจำนวน coins ที่จะได้รับ
      embed.addFields({
        name: `แพ็ค ${pack.packNumber} - ${pack.price} บาท`,
        value: `💰 **${coins.toLocaleString()} coins**\n🎁 โบนัส: ${pack.bonus}%\n📦 Base: ${pack.baseCopper.toLocaleString()} coins`,
        inline: true,
      });
    }

    embed.setFooter({ text: `หน้า 1 จาก ${totalPages}` });

    // สร้างปุ่มสำหรับแต่ละแพ็ค (แสดง 5 แพ็คแรก)
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const firstPagePacks = packs.slice(0, packsPerPage);

    for (let i = 0; i < firstPagePacks.length; i += 3) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      const rowPacks = firstPagePacks.slice(i, i + 3);
      rowPacks.forEach((pack) => {
        const button = new ButtonBuilder()
          .setCustomId(`buy_pack_${pack.packNumber}`)
          .setLabel(`แพ็ค ${pack.packNumber} (${pack.price}฿)`)
          .setStyle(ButtonStyle.Primary);
        row.addComponents(button);
      });
      rows.push(row);
    }

    // เพิ่ม pagination ถ้ามีมากกว่า 1 หน้า
    if (totalPages > 1) {
      const paginationRow = new ActionRowBuilder<ButtonBuilder>();
      if (totalPages > 1) {
        paginationRow.addComponents(
          new ButtonBuilder()
            .setCustomId('coin_packs_page_2')
            .setLabel('หน้าถัดไป →')
            .setStyle(ButtonStyle.Secondary),
        );
      }
      rows.push(paginationRow);
    }

    return interaction.reply({
      embeds: [embed],
      components: rows,
      ephemeral: true,
    });
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

  @Button('pay_pack_:packNumber')
  public async onPayPackButton(@Context() [interaction]: ButtonContext) {
    // Parse custom ID: pay_pack_<packNumber>-<userId>-<requiredAmount>-<currentBalance>
    const customId = interaction.customId;
    const packNumberMatch = customId.match(/pay_pack_(\d+)-(.+)-(.+)-(.+)/);

    if (!packNumberMatch) {
      return interaction.reply({
        content: 'ไม่พบแพ็คที่เลือก',
        ephemeral: true,
      });
    }

    const packNumber = parseInt(packNumberMatch[1], 10);
    const userId = packNumberMatch[2];
    const requiredAmount = parseFloat(packNumberMatch[3]);
    const currentBalance = parseFloat(packNumberMatch[4]);

    if (isNaN(packNumber)) {
      return interaction.reply({
        content: 'ไม่พบแพ็คที่เลือก',
        ephemeral: true,
      });
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const pack = await (this.prisma as any).coinPack.findUnique({
        where: { packNumber },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!pack || !pack.isActive) {
        return interaction.reply({
          content: 'ไม่พบแพ็คที่เลือกหรือแพ็คนี้ไม่พร้อมใช้งาน',
          ephemeral: true,
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return this.showPaymentPageForPack(
        [interaction],
        userId,
        pack,
        requiredAmount,
        currentBalance,
        `ชำระเงินเพื่อเติม Copper: ต้องการ ${requiredAmount} Copper`,
      );
    } catch (error) {
      console.error('Error processing pack selection:', error);
      return interaction.reply({
        content: 'เกิดข้อผิดพลาดในการเลือกแพ็ค กรุณาลองใหม่อีกครั้ง',
        ephemeral: true,
      });
    }
  }

  @Button('buy_pack_:packNumber')
  /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  public async onBuyPackButton(@Context() [interaction]: ButtonContext) {
    const packNumber = parseInt(
      interaction.customId.replace('buy_pack_', ''),
      10,
    );

    if (isNaN(packNumber)) {
      return interaction.reply({
        content: 'ไม่พบแพ็คที่เลือก',
        ephemeral: true,
      });
    }

    // ตรวจสอบว่าผู้ใช้ลงทะเบียนแล้วหรือยัง
    const user = await this.prisma.user.findFirst({
      where: { discordId: interaction.user.id },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      return this.showRegistrationModal([interaction]);
    }

    // หาแพ็ค
    const pack = await (this.prisma as any).coinPack.findUnique({
      where: { packNumber },
    });

    if (!pack || !pack.isActive) {
      return interaction.reply({
        content: 'ไม่พบแพ็คที่เลือกหรือแพ็คนี้ไม่พร้อมใช้งาน',
        ephemeral: true,
      });
    }

    // แสดงหน้าชำระเงินสำหรับซื้อแพ็ค
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.showPaymentPageForPack([interaction], user.id, pack);
  }

  @SlashCommand({
    name: 'buy-pack',
    description: 'ซื้อแพ็คแลกเปลี่ยน Coin',
  })
  public async onBuyPack(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: BuyPackDto,
  ) {
    // ตรวจสอบว่าผู้ใช้ลงทะเบียนแล้วหรือยัง
    const user = await this.prisma.user.findFirst({
      where: { discordId: interaction.user.id },
      include: { wallet: true },
    });

    if (!user || !user.wallet) {
      return this.showRegistrationModal([interaction]);
    }

    // หาแพ็ค
    const pack = await (this.prisma as any).coinPack.findUnique({
      where: { packNumber: options.pack },
    });

    if (!pack || !pack.isActive) {
      return interaction.reply({
        content: 'ไม่พบแพ็คที่เลือกหรือแพ็คนี้ไม่พร้อมใช้งาน',
        ephemeral: true,
      });
    }

    // แสดงหน้าชำระเงินสำหรับซื้อแพ็ค
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.showPaymentPageForPack([interaction], user.id, pack);
  }
}
