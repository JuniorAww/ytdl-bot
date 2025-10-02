import Module from '../module.js'
import { Markup } from 'telegraf'
import { Innertube, UniversalCache, Utils } from 'youtubei.js';
import { writeFileSync, mkdirSync, createWriteStream, readFileSync, existsSync, appendFileSync } from "node:fs";
import { request } from 'https'
import { parse } from 'url'
import '../utils/youtube.js';

class YoutubeModule extends Module {
    description = "YouTube"
    priority = 5
    
    onMessage(ctx, next) {
        return onMessage(ctx, next);
    }
    
    onCallback(ctx, next) {
        return onCallback(ctx, next);
    }
}

const yt = await Innertube.create({
    lang: 'ru',
    location: 'NL',
    //device_category: 'MOBILE',
    //client_type: 'ANDROID',
    cache: new UniversalCache(false), 
    generate_session_locally: true 
});

console.log('+ Created innertube session')



const getQueryStart = text => {
    const queryStarts = text.indexOf('?')
    return queryStarts === -1 ? text.length : queryStarts
}

const onCallback = async (ctx, next) => {
    ctx.answerCbQuery("✅");
    
    const query = ctx.callbackQuery?.['data']
    
    if(query.match(/download (.*)/)) {
        const [ _, folder ] = query.split(' ')
        await downloadAndPushToYandexDrive(ctx, folder)
    }
}

const onMessage = async (ctx, next) => {
    const text = ctx.message.text
    if (!text) return;
    console.log(ctx.from.first_name + ': ' + text)
    
    let videoId = null
    
    if(text.match(/https:\/\/((www\.|)youtube\.com|youtu.be)\//)) {
        if(text.match("youtu.be")) {
            const lastSegment = text.split('/')[3]
            const idEnds = getQueryStart(lastSegment)
            videoId = lastSegment.slice(0, idEnds)
        }
        else if(text.match(/\/(shorts|live)\//)) {
            const lastSegment = text.split('/')[4]
            const idEnds = getQueryStart(lastSegment)
            videoId = lastSegment.slice(0, idEnds)
        }
        else if(text.match(/watch\?/)) {
            const idEnds = text.indexOf('&') === -1 ? text.length : text.indexOf('&')
            videoId = text.slice(text.indexOf('?v=') + 3, idEnds)
        }
        else await ctx.reply(`Не удалось определить ID видео!\nБот требует доработки.`)
    }
    else if (text.match(/^\/folders\n(.*)/)) {
        const folders = text.slice(text.indexOf('\n') + 1).split('\n').map(str => {
            const path = str.slice(0, str.indexOf(' '))
            const name = str.slice(str.indexOf(' ') + 1)
            return { name, path }
        })
        console.log(folders)
        const user = await ctx.getUser()
        user.folders = folders;
        return await ctx.reply(`Настроено ${folders.length} папок!`)
    }
    else if (text.match()) {
        
    }

    if(videoId) askFolder(ctx, videoId)
    else next()
}

const config = {
    headers: { Authorization: 'OAuth ' + process.env.YAPI_TOKEN }
}

const uploadPath = "/1ютуба/"

const askFolder = async (ctx, videoId) => {
    const user = await ctx.getUser();
    
    if (!user.folders?.length) return await ctx.reply(`Настройте папки`);
    
    try {
        const videoInfo = await yt.getInfo(videoId);
        
        const { basic_info, primary_info } = videoInfo;
        if (!basic_info || !basic_info.title) return await ctx.reply(`Не удалось узнать название видео!\n` + JSON.parse(videoInfo))
        
        const text = `<b>${basic_info.title}</b>\n`
                   + `<b>Видео от:</b> ${primary_info.published.text}\n`
                   + `\nПожалуйста, выберите папку!`
        
        const keyboard = Markup.inlineKeyboard(
            user.folders.map(folder => [
                Markup.button.callback(folder.name, `download ${folder.path}`)
            ])
        )
        
        await ctx.react({ type: "emoji", emoji: "👍" });
        
        user.ytdl = {
            name: basic_info.title,
            videoId,
        }
        
        await ctx.reply(text, { ...keyboard, parse_mode: 'HTML' })
    } catch (e) {
        console.error(e)
        await ctx.reply(`Видео недоступно!\nВероятно, оно удалено или стало приватным.`)
    }
}

const downloadAndPushToYandexDrive = async (ctx, folder) => {  
    const user = await ctx.getUser();
    
    if (!user.ytdl) return;
    
    const { name, videoId } = user.ytdl;
    
    await ctx.deleteMessage();
    const { message_id } = await ctx.reply(`Начинаю скачивание.`)
    
    let stage = "получения видео " + videoId
    
    let uploaded = 0;
    
    let prevText = null
    const edit = text => {
        console.log(text)
        if(text === prevText) return;
        prevText = text;
        ctx.telegram.editMessageText(ctx.from.id, message_id, 0, text)
    }
    
    const showStatus = setInterval(() => {
        edit(`Скачано ${(uploaded / 1024 / 1024).toFixed(1)} Мб`)
    }, 1337)
    
    try {
        const stream = await yt.download(videoId, {
          type: 'video+audio',
          quality: 'bestefficiency',
          format: 'mp4', 
          client: 'Android'
        });
        
        if(!stream) throw "ютуб не дал скачать"
        
        stage = "запроса к Яндекс Диску"
        const encoded = encodeURI("https://cloud-api.yandex.net/v1/disk/resources/upload?overwrite=false&path=disk:" + folder + name);
        const yandex_response = await fetch(encoded, config)
        
        stage = "запроса ссылки Яндекс Диска"
        const response = await yandex_response.json()
        console.log(response)
        
        if (response.error) throw response.message;
        
        const { href } = response;
        
        stage = "скачивания видео"
        const options = { ...parse(href), method: 'PUT' };
        
        const uploadStream = request(options, res => {
            if (res.statusCode === 201 || res.statusCode === 202) {
                edit("Успешное скачивание!");
            } else {
                let data = "";
                res.on("data", chunk => data += chunk);
                res.on("end", () => {
                    edit(`Ошибка при загрузке: ${res.statusCode}\n${data}`);
                });
            }
        });

        uploadStream.on("error", err => {
            console.error("Ошибка при загрузке:", err);
            edit("Ошибка при загрузке на Яндекс Диск");
        });

        try {
            for await (const chunk of Utils.streamToIterable(stream)) {
                uploaded += chunk.length;
                uploadStream.write(chunk);
            }
            uploadStream.end();
        } catch (e) {
            console.warn("Stream closed early:", e);
            uploadStream.end();
        }
    } catch (e) {
        console.error(e)
        ctx.reply(`Что-то пошло не так на этапе ${stage}\n\nПолная ошибка:\n${e}`)
    } finally {
        clearInterval(showStatus)
    }
}

export default YoutubeModule
