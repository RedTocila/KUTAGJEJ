import UIKit
import WebKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // Hand the APNs device token to the Capacitor push plugin (no Firebase).
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

}

/// System activity indicator parked in the rubber-band gap, below the status bar.
/// UIRefreshControl draws in the top inset, which sits under the Dynamic Island here.
private final class PagePullRefresh: NSObject {
    private let indicator = UIActivityIndicatorView(style: .medium)
    private weak var host: BridgeViewController?
    private var observation: NSKeyValueObservation?
    private var phase: Phase = .idle
    private var finishToken = 0
    private let hold: CGFloat = 64
    private let trigger: CGFloat = 72

    private enum Phase {
        case idle
        case holding
        case closing
    }

    var isRefreshing: Bool { phase != .idle }

    func attach(to controller: BridgeViewController) {
        host = controller
        guard let scroll = controller.webView?.scrollView else { return }
        indicator.hidesWhenStopped = false
        indicator.isUserInteractionEnabled = false
        indicator.alpha = 0
        indicator.sizeToFit()
        controller.view.addSubview(indicator)
        controller.view.bringSubviewToFront(indicator)
        scroll.panGestureRecognizer.addTarget(self, action: #selector(handlePan(_:)))
        observation = scroll.observe(\.contentOffset, options: [.new]) { [weak self] scrollView, _ in
            if Thread.isMainThread {
                self?.layout(scrollView)
            } else {
                DispatchQueue.main.async { self?.layout(scrollView) }
            }
        }
        applyStyle(dark: true)
        layout(scroll)
    }

    func applyStyle(dark: Bool) {
        indicator.overrideUserInterfaceStyle = dark ? .dark : .light
        indicator.color = nil
    }

    func layout(_ scroll: UIScrollView) {
        guard phase != .closing, let host = host else { return }
        let pulled = max(0, -scroll.contentOffset.y)
        let safeTop = host.view.safeAreaInsets.top
        let shown = phase == .holding ? max(pulled, hold) : pulled
        let alpha: CGFloat = phase == .holding ? 1 : min(1, max(0, (pulled - 8) / 48))
        indicator.alpha = alpha
        if alpha > 0.04 {
            if !indicator.isAnimating { indicator.startAnimating() }
        } else if phase == .idle {
            indicator.stopAnimating()
        }
        if phase == .idle, pulled < 0.5, indicator.alpha == 0 { return }
        indicator.center = CGPoint(x: host.view.bounds.midX, y: safeTop + shown / 2)
    }

    @objc private func handlePan(_ pan: UIPanGestureRecognizer) {
        guard phase == .idle, pan.state == .ended else { return }
        guard let webView = host?.webView else { return }
        let pulled = max(0, -webView.scrollView.contentOffset.y)
        guard pulled >= trigger else { return }
        webView.evaluateJavaScript(Self.canRefreshScript) { [weak self] result, _ in
            guard let self = self, self.phase == .idle, Self.isTrue(result) else { return }
            self.begin(webView)
        }
    }

    private func begin(_ webView: WKWebView) {
        phase = .holding
        finishToken += 1
        let token = finishToken
        layout(webView.scrollView)
        webView.evaluateJavaScript(Self.startRefreshScript) { [weak self] result, _ in
            guard let self = self, self.finishToken == token, self.phase == .holding else { return }
            if !Self.isTrue(result) {
                self.end()
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 15) { [weak self] in
            guard let self = self, self.finishToken == token else { return }
            self.end()
        }
    }

    func end() {
        guard phase == .holding, let scroll = host?.webView?.scrollView else { return }
        phase = .closing
        finishToken += 1
        UIView.animate(withDuration: 0.2, delay: 0, options: [.curveEaseOut, .beginFromCurrentState]) {
            self.indicator.alpha = 0
        } completion: { [weak self] _ in
            guard let self = self else { return }
            self.phase = .idle
            self.indicator.stopAnimating()
            self.layout(scroll)
        }
    }

    private static func isTrue(_ value: Any?) -> Bool {
        if let flag = value as? Bool { return flag }
        if let number = value as? NSNumber { return number.boolValue }
        return false
    }

    private static let canRefreshScript = """
    (function () {
      try {
        var d = document, b = d.body, h = d.documentElement;
        if (!b) return false;
        if (b.style.position === 'fixed' || b.style.overflow === 'hidden' || h.style.overflow === 'hidden') return false;
        if (d.querySelector('.MuiModal-root:not(.MuiModal-hidden), [aria-modal="true"], [data-no-pull-refresh]')) return false;
        if ((window.scrollY || h.scrollTop || b.scrollTop || 0) > 2) return false;
        return typeof window.__kutagjejPullRefresh === 'function';
      } catch (e) {
        return false;
      }
    })()
    """

    private static let startRefreshScript = """
    (function () {
      try {
        if (typeof window.__kutagjejPullRefresh !== 'function') return false;
        window.__kutagjejPullRefresh();
        return true;
      } catch (e) {
        return false;
      }
    })()
    """
}

/// Hosts the Capacitor web view. Pull-to-refresh uses the system activity indicator.
/// Set as the custom class of the root view controller in Main.storyboard.
class BridgeViewController: CAPBridgeViewController, WKScriptMessageHandler {
    private let pagePull = PagePullRefresh()
    var isRefreshHeld: Bool { pagePull.isRefreshing }
    var offlineCoverVisible: Bool { offlineView.superview != nil }
    private var publishedSafeTop: CGFloat = -1
    private var loadingObservation: NSKeyValueObservation?
    private var navigationProxy: NavigationDelegateProxy?
    private lazy var offlineView = OfflineView()
    private var lastFailedURL: URL?

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        pinWebViewToScreen()
        publishSafeArea()
        if let scroll = webView?.scrollView {
            pagePull.layout(scroll)
        }
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        pinWebViewToScreen()
        publishSafeArea()
    }

    /// Draw the web view across the whole glass, including under the status bar and home indicator.
    private func pinWebViewToScreen() {
        guard let webView = webView else { return }
        edgesForExtendedLayout = .all
        extendedLayoutIncludesOpaqueBars = true
        additionalSafeAreaInsets = .zero
        view.insetsLayoutMarginsFromSafeArea = false
        let pinned = view.constraints.filter {
            ($0.firstItem as AnyObject?) === webView || ($0.secondItem as AnyObject?) === webView
        }
        if !pinned.isEmpty {
            NSLayoutConstraint.deactivate(pinned)
            webView.translatesAutoresizingMaskIntoConstraints = true
        }
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        if webView.frame != view.bounds {
            webView.frame = view.bounds
        }
        let scroll = webView.scrollView
        scroll.contentInsetAdjustmentBehavior = .never
        scroll.bounces = true
        scroll.alwaysBounceVertical = true
        scroll.alwaysBounceHorizontal = false
        if !pagePull.isRefreshing {
            scroll.contentInset = .zero
        }
        let top = view.safeAreaInsets.top
        let bottom = view.safeAreaInsets.bottom
        scroll.verticalScrollIndicatorInsets.top = top
        scroll.verticalScrollIndicatorInsets.bottom = bottom
    }

    /// Tell the page how tall the status bar is. CSS `env(safe-area-inset-top)` stays 0
    /// in this edge-to-edge web view, so headers use `--kg-safe-top` instead.
    private func publishSafeArea() {
        guard let webView = webView else { return }
        let top = view.safeAreaInsets.top
        guard top > 1, abs(top - publishedSafeTop) > 0.5 else { return }
        publishedSafeTop = top
        let bottom = view.safeAreaInsets.bottom
        let js = "document.documentElement.style.setProperty('--kg-safe-top','\(top)px');document.documentElement.style.setProperty('--kg-safe-bottom','\(bottom)px');"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let webView = webView else { return }

        webView.scrollView.bounces = true
        webView.scrollView.alwaysBounceVertical = true
        webView.scrollView.refreshControl = nil
        pagePull.attach(to: self)
        applyPageBackground(dark: true)
        installThemeBackgroundSync(on: webView)

        loadingObservation = webView.observe(\.isLoading, options: [.new]) { [weak self] webView, _ in
            guard !webView.isLoading else { return }
            DispatchQueue.main.async { self?.finishRefreshing() }
        }

        let proxy = NavigationDelegateProxy(target: webView.navigationDelegate)
        proxy.onNetworkFailure = { [weak self] url in self?.showOffline(failedURL: url) }
        proxy.onPageLoaded = { [weak self] in
            self?.hideOffline()
            self?.webView?.evaluateJavaScript(Self.themeSyncScript)
        }
        navigationProxy = proxy
        webView.navigationDelegate = proxy

        offlineView.onRetry = { [weak self] in self?.retryAfterOffline() }
    }

    private func showOffline(failedURL: URL?) {
        finishRefreshing()
        if let failedURL = failedURL, failedURL.scheme == "https" {
            lastFailedURL = failedURL
        }
        guard offlineView.superview == nil else {
            offlineView.setRetrying(false)
            return
        }
        offlineView.frame = view.bounds
        offlineView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(offlineView)
    }

    private func hideOffline() {
        offlineView.removeFromSuperview()
        offlineView.setRetrying(false)
    }

    private func retryAfterOffline() {
        guard let webView = webView else { return }
        offlineView.setRetrying(true)
        let target = lastFailedURL ?? bridge?.config.serverURL ?? URL(string: "https://kutagjej.al/")!
        webView.load(URLRequest(url: target))
    }

    /// Page color behind a pull, so the bounce does not reveal a different black.
    private static let themeSyncScript = """
    (function () {
      if (window.__kgThemeSync) return;
      window.__kgThemeSync = true;
      function send() {
        try {
          var dark = document.documentElement.classList.contains('dark');
          window.webkit.messageHandlers.kutagjejTheme.postMessage(dark ? 'dark' : 'light');
        } catch (e) {}
      }
      send();
      new MutationObserver(send).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    })();
    """

    private func installThemeBackgroundSync(on webView: WKWebView) {
        let controller = webView.configuration.userContentController
        controller.removeScriptMessageHandler(forName: "kutagjejTheme")
        controller.add(self, name: "kutagjejTheme")
        controller.removeScriptMessageHandler(forName: "kutagjejRefresh")
        controller.add(self, name: "kutagjejRefresh")
        let script = WKUserScript(source: Self.themeSyncScript, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        controller.addUserScript(script)
        let nativePull = WKUserScript(
            source: "document.documentElement.dataset.nativePull='1';",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        controller.addUserScript(nativePull)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "kutagjejRefresh" {
            pagePull.end()
            return
        }
        applyPageBackground(dark: (message.body as? String) != "light")
        pagePull.applyStyle(dark: (message.body as? String) != "light")
    }

    private func applyPageBackground(dark: Bool) {
        let color = dark
            ? UIColor(red: 10 / 255, green: 10 / 255, blue: 10 / 255, alpha: 1)
            : UIColor.white
        view.backgroundColor = color
        webView?.isOpaque = true
        webView?.backgroundColor = color
        webView?.scrollView.backgroundColor = color
        view.window?.backgroundColor = color
        pagePull.applyStyle(dark: dark)
    }

    private func finishRefreshing() {
        pagePull.end()
    }
}

/// Sits between the web view and Capacitor's navigation delegate: every call is forwarded unchanged,
/// and real connectivity failures additionally show the native offline screen.
private final class NavigationDelegateProxy: NSObject, WKNavigationDelegate {
    private weak var target: WKNavigationDelegate?
    var onNetworkFailure: ((URL?) -> Void)?
    var onPageLoaded: (() -> Void)?

    init(target: WKNavigationDelegate?) {
        self.target = target
        super.init()
    }

    override func responds(to aSelector: Selector!) -> Bool {
        super.responds(to: aSelector) || (target?.responds(to: aSelector) ?? false)
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        (target?.responds(to: aSelector) ?? false) ? target : nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        target?.webView?(webView, didFinish: navigation)
        onPageLoaded?()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        target?.webView?(webView, didFail: navigation, withError: error)
        reportIfOffline(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        target?.webView?(webView, didFailProvisionalNavigation: navigation, withError: error)
        reportIfOffline(error)
    }

    private func reportIfOffline(_ error: Error) {
        let nsError = error as NSError
        guard nsError.domain == NSURLErrorDomain else { return }
        let offlineCodes: Set<Int> = [
            NSURLErrorNotConnectedToInternet,
            NSURLErrorNetworkConnectionLost,
            NSURLErrorTimedOut,
            NSURLErrorCannotFindHost,
            NSURLErrorCannotConnectToHost,
            NSURLErrorDNSLookupFailed,
            NSURLErrorDataNotAllowed,
            NSURLErrorInternationalRoamingOff,
        ]
        guard offlineCodes.contains(nsError.code) else { return }
        onNetworkFailure?(nsError.userInfo[NSURLErrorFailingURLErrorKey] as? URL)
    }
}

/// Native "no connection" screen with a retry button (instead of a blank web view).
private final class OfflineView: UIView {
    var onRetry: (() -> Void)?
    private let retryButton = UIButton(type: .system)
    private let spinner = UIActivityIndicatorView(style: .medium)

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .systemBackground

        let icon = UIImageView(image: UIImage(systemName: "wifi.slash"))
        icon.tintColor = .secondaryLabel
        icon.contentMode = .scaleAspectFit
        icon.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 48, weight: .regular)

        let title = UILabel()
        title.text = "Nuk ka lidhje interneti"
        title.font = .preferredFont(forTextStyle: .title2)
        title.adjustsFontForContentSizeCategory = true
        title.textAlignment = .center
        title.numberOfLines = 0

        let message = UILabel()
        message.text = "Kontrollo Wi‑Fi ose të dhënat celulare dhe provo përsëri."
        message.font = .preferredFont(forTextStyle: .body)
        message.adjustsFontForContentSizeCategory = true
        message.textColor = .secondaryLabel
        message.textAlignment = .center
        message.numberOfLines = 0

        var config = UIButton.Configuration.filled()
        config.title = "Provo përsëri"
        config.cornerStyle = .large
        config.baseBackgroundColor = UIColor(red: 0x5f / 255, green: 0x98 / 255, blue: 0x16 / 255, alpha: 1)
        config.contentInsets = NSDirectionalEdgeInsets(top: 12, leading: 24, bottom: 12, trailing: 24)
        retryButton.configuration = config
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)

        spinner.hidesWhenStopped = true

        let stack = UIStackView(arrangedSubviews: [icon, title, message, retryButton, spinner])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 14
        stack.setCustomSpacing(24, after: message)
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)

        NSLayoutConstraint.activate([
            stack.centerYAnchor.constraint(equalTo: safeAreaLayoutGuide.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: layoutMarginsGuide.leadingAnchor),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: layoutMarginsGuide.trailingAnchor),
            stack.centerXAnchor.constraint(equalTo: centerXAnchor),
            stack.widthAnchor.constraint(lessThanOrEqualToConstant: 420),
        ])
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func setRetrying(_ retrying: Bool) {
        retryButton.isEnabled = !retrying
        if retrying {
            spinner.startAnimating()
        } else {
            spinner.stopAnimating()
        }
    }

    @objc private func retryTapped() {
        onRetry?()
    }
}
