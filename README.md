# Floating Particles

Floating Particles 是一个 Halo 插件，用于在前台页面添加可配置的粒子漂浮效果和鼠标动效。

## 功能

- 在 Halo 后台一键开启或关闭前台动效。
- 页面粒子效果支持无粒子、雪花飘落、星空漂浮、气泡上升、萤火闪烁、樱花飘落、水波涟漪。
- 鼠标动效支持关闭、点击礼花、水波涟漪。
- 支持调整数量、颜色、透明度和速度。
- Three.js 已打包到插件本地静态资源，不依赖外部 CDN。

## 安装

1. 下载构建产物 `plugin-floating-particles-*.jar`。
2. 进入 Halo 后台的插件管理页面。
3. 上传 JAR 文件并启用插件。
4. 在插件设置中选择页面粒子效果和鼠标动效。

## 开发环境

- Java 21+
- Gradle Wrapper

## 构建

```bash
./gradlew.bat clean build -x test
```

构建完成后，可以在 `build/libs` 目录找到插件 JAR 文件。

## 许可证

[GPL-3.0](./LICENSE) © 王鑫杨
