// Pixel Beacon — booth app.
//
// Runs a small web server on this laptop. The booth screen opens in the
// browser; each finished poster is saved next to the program as a PNG and
// a WAV "alien signal", and phones on the same Wi-Fi scan a QR code to
// download both.
package main

import (
	"bytes"
	"crypto/rand"
	"embed"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"html/template"
	"io/fs"
	"log"
	"math"
	mrand "math/rand"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"time"
)

//go:embed web
var webFS embed.FS

const (
	sampleRate = 22050
	toneOne    = 1320.0 // Hz for a 1 bit
	toneZero   = 880.0  // Hz for a 0 bit
)

var (
	dataDir string
	idRe    = regexp.MustCompile(`^[a-z0-9]{8}$`)
	port    int
)

type poster struct {
	ID      string    `json:"id"`
	Name    string    `json:"name"`
	Cols    int       `json:"cols"`
	Rows    int       `json:"rows"`
	Bps     int       `json:"bps"`
	Bits    string    `json:"bits"`
	Token   string    `json:"token"`
	Created time.Time `json:"created"`
}

func main() {
	exe, err := os.Executable()
	if err != nil {
		exe = "."
	}
	dataDir = filepath.Join(filepath.Dir(exe), "PixelBeacon-posters")
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		log.Fatalf("Can't create the posters folder %s: %v", dataDir, err)
	}

	sub, _ := fs.Sub(webFS, "web")
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		b, _ := fs.ReadFile(sub, "booth.html")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		w.Write(b)
	})
	mux.Handle("/fonts/", http.FileServer(http.FS(sub)))
	mux.Handle("/media/", http.FileServer(http.FS(sub)))
	mux.HandleFunc("/api/info", handleInfo)
	mux.HandleFunc("/api/posters", handleCreate)
	mux.HandleFunc("/p/", handlePhonePage)
	mux.HandleFunc("/f/", handleFile)

	ln, p := listen()
	port = p
	local := fmt.Sprintf("http://localhost:%d/", port)

	fmt.Println("==============================================")
	fmt.Println("  PIXEL BEACON is running")
	fmt.Println("==============================================")
	fmt.Println("  Booth screen:  " + local)
	for _, ip := range lanIPs() {
		fmt.Printf("  Phones use:    http://%s:%d\n", ip, port)
	}
	if len(lanIPs()) == 0 {
		fmt.Println("  !! This laptop is not on a network. Connect to Wi-Fi so phones can scan.")
	}
	fmt.Println("  Posters saved in: " + dataDir)
	fmt.Println()
	fmt.Println("  Keep this window open during the event. Close it to stop.")
	fmt.Println("==============================================")

	go func() {
		time.Sleep(400 * time.Millisecond)
		openBrowser(local)
	}()
	log.Fatal(http.Serve(ln, logRequests(mux)))
}

func listen() (net.Listener, int) {
	for p := 8080; p < 8100; p++ {
		ln, err := net.Listen("tcp", fmt.Sprintf(":%d", p))
		if err == nil {
			return ln, p
		}
	}
	log.Fatal("No free port between 8080 and 8099. Close other programs and try again.")
	return nil, 0
}

func logRequests(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/p/") {
			fmt.Printf("  [%s] phone opened %s\n", time.Now().Format("15:04:05"), r.URL.Path)
		}
		h.ServeHTTP(w, r)
	})
}

// lanIPs lists private IPv4 addresses, Wi-Fi/Ethernet first, virtual adapters last.
func lanIPs() []string {
	type cand struct {
		ip    string
		score int
	}
	var cs []cand
	ifaces, _ := net.Interfaces()
	for _, ifc := range ifaces {
		if ifc.Flags&net.FlagUp == 0 || ifc.Flags&net.FlagLoopback != 0 {
			continue
		}
		name := strings.ToLower(ifc.Name)
		score := 0
		if strings.Contains(name, "wi-fi") || strings.Contains(name, "wifi") || strings.Contains(name, "wlan") || strings.Contains(name, "wireless") {
			score = 3
		} else if strings.Contains(name, "ethernet") || strings.HasPrefix(name, "eth") || strings.HasPrefix(name, "en") {
			score = 2
		} else if strings.Contains(name, "local area connection") {
			score = 1 // often the Windows mobile hotspot
		}
		for _, v := range []string{"vethernet", "virtual", "vmware", "virtualbox", "hyper-v", "wsl", "docker", "loopback", "bluetooth", "tailscale", "zerotier", "openvpn", "tap"} {
			if strings.Contains(name, v) {
				score = -1
			}
		}
		addrs, _ := ifc.Addrs()
		for _, a := range addrs {
			ipn, ok := a.(*net.IPNet)
			if !ok {
				continue
			}
			ip4 := ipn.IP.To4()
			if ip4 == nil || !ip4.IsPrivate() {
				continue
			}
			cs = append(cs, cand{ip4.String(), score})
		}
	}
	sort.SliceStable(cs, func(i, j int) bool { return cs[i].score > cs[j].score })
	out := []string{}
	if forced := os.Getenv("PIXELBEACON_IP"); forced != "" {
		out = append(out, forced)
	}
	for _, c := range cs {
		out = append(out, c.ip)
	}
	return out
}

func handleInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"ips": lanIPs(), "port": fmt.Sprint(port)})
}

type createReq struct {
	Name  string `json:"name"`
	Cols  int    `json:"cols"`
	Rows  int    `json:"rows"`
	Bps   int    `json:"bps"`
	Bits  string `json:"bits"`
	Token string `json:"token"`
	PNG   string `json:"png"`
}

func handleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", http.StatusMethodNotAllowed)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 8<<20)
	var req createReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if req.Cols < 3 || req.Cols > 40 || req.Rows < 3 || req.Rows > 80 || len(req.Bits) != req.Cols*req.Rows || strings.Trim(req.Bits, "01") != "" {
		http.Error(w, "bad drawing", http.StatusBadRequest)
		return
	}
	if req.Bps < 10 || req.Bps > 400 {
		req.Bps = 100
	}
	name := strings.TrimSpace(req.Name)
	if r := []rune(name); len(r) > 20 {
		name = string(r[:20])
	}
	const prefix = "data:image/png;base64,"
	if !strings.HasPrefix(req.PNG, prefix) {
		http.Error(w, "bad picture", http.StatusBadRequest)
		return
	}
	png, err := base64.StdEncoding.DecodeString(req.PNG[len(prefix):])
	if err != nil || len(png) < 8 || !bytes.HasPrefix(png, []byte("\x89PNG")) {
		http.Error(w, "bad picture", http.StatusBadRequest)
		return
	}
	id := newID()
	p := poster{ID: id, Name: name, Cols: req.Cols, Rows: req.Rows, Bps: req.Bps, Bits: req.Bits, Token: req.Token, Created: time.Now()}
	meta, _ := json.MarshalIndent(p, "", "  ")
	if err := os.WriteFile(filepath.Join(dataDir, id+".png"), png, 0o644); err != nil {
		http.Error(w, "can't save", http.StatusInternalServerError)
		return
	}
	if err := os.WriteFile(filepath.Join(dataDir, id+".wav"), makeWAV(req.Bits, req.Bps), 0o644); err != nil {
		http.Error(w, "can't save", http.StatusInternalServerError)
		return
	}
	os.WriteFile(filepath.Join(dataDir, id+".json"), meta, 0o644)
	fmt.Printf("  [%s] saved poster %s for %q\n", time.Now().Format("15:04:05"), id, name)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"id": id})
}

func newID() string {
	const al = "abcdefghjkmnpqrstuvwxyz23456789"
	b := make([]byte, 8)
	rand.Read(b)
	for i := range b {
		b[i] = al[int(b[i])%len(al)]
	}
	return string(b)
}

// makeWAV turns the bits into a two-tone (FSK) radio signal, like the 1974 Arecibo broadcast.
func makeWAV(bits string, bps int) []byte {
	lead := sampleRate * 3 / 10
	perBit := float64(sampleRate) / float64(bps)
	n := lead*2 + int(math.Ceil(perBit*float64(len(bits))))
	samples := make([]int16, n)
	rng := mrand.New(mrand.NewSource(1))
	phase := 0.0
	fade := float64(sampleRate) * 0.008
	total := float64(len(bits)) * perBit
	for i := 0; i < n; i++ {
		noise := (rng.Float64()*2 - 1) * 0.02
		t := float64(i - lead)
		v := noise
		if t >= 0 && t < total {
			bi := int(t / perBit)
			f := toneZero
			if bits[bi] == '1' {
				f = toneOne
			}
			phase += 2 * math.Pi * f / sampleRate
			env := 1.0
			if t < fade {
				env = t / fade
			} else if total-t < fade {
				env = (total - t) / fade
			}
			v += math.Sin(phase) * 0.55 * env
		}
		if v > 1 {
			v = 1
		} else if v < -1 {
			v = -1
		}
		samples[i] = int16(v * 32000)
	}
	var buf bytes.Buffer
	dataLen := uint32(n * 2)
	buf.WriteString("RIFF")
	binary.Write(&buf, binary.LittleEndian, uint32(36)+dataLen)
	buf.WriteString("WAVEfmt ")
	binary.Write(&buf, binary.LittleEndian, uint32(16))
	binary.Write(&buf, binary.LittleEndian, uint16(1)) // PCM
	binary.Write(&buf, binary.LittleEndian, uint16(1)) // mono
	binary.Write(&buf, binary.LittleEndian, uint32(sampleRate))
	binary.Write(&buf, binary.LittleEndian, uint32(sampleRate*2))
	binary.Write(&buf, binary.LittleEndian, uint16(2))
	binary.Write(&buf, binary.LittleEndian, uint16(16))
	buf.WriteString("data")
	binary.Write(&buf, binary.LittleEndian, dataLen)
	binary.Write(&buf, binary.LittleEndian, samples)
	return buf.Bytes()
}

func loadPoster(id string) (*poster, bool) {
	if !idRe.MatchString(id) {
		return nil, false
	}
	b, err := os.ReadFile(filepath.Join(dataDir, id+".json"))
	if err != nil {
		return nil, false
	}
	var p poster
	if json.Unmarshal(b, &p) != nil {
		return nil, false
	}
	return &p, true
}

func fileSlug(p *poster) string {
	s := strings.ToLower(p.Name)
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		} else if b.Len() > 0 && !strings.HasSuffix(b.String(), "-") {
			b.WriteRune('-')
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		out = p.ID
	}
	return "pixel-beacon-" + out
}

// /f/<id>.png or /f/<id>.wav ; add ?dl=1 to force a download
func handleFile(w http.ResponseWriter, r *http.Request) {
	base := strings.TrimPrefix(r.URL.Path, "/f/")
	ext := filepath.Ext(base)
	id := strings.TrimSuffix(base, ext)
	p, ok := loadPoster(id)
	if !ok || (ext != ".png" && ext != ".wav") {
		http.NotFound(w, r)
		return
	}
	if r.URL.Query().Get("dl") == "1" {
		suffix := ".png"
		if ext == ".wav" {
			suffix = "-alien-signal.wav"
		}
		w.Header().Set("Content-Disposition", `attachment; filename="`+fileSlug(p)+suffix+`"`)
	}
	if ext == ".wav" {
		w.Header().Set("Content-Type", "audio/wav")
	} else {
		w.Header().Set("Content-Type", "image/png")
	}
	http.ServeFile(w, r, filepath.Join(dataDir, id+ext))
}

func factor(n int) []int {
	f := []int{}
	for d := 2; d*d <= n; d++ {
		for n%d == 0 {
			f = append(f, d)
			n /= d
		}
	}
	if n > 1 {
		f = append(f, n)
	}
	return f
}

var phoneTmpl = template.Must(template.New("p").Parse(phoneHTML))

func handlePhonePage(w http.ResponseWriter, r *http.Request) {
	id := strings.Trim(strings.TrimPrefix(r.URL.Path, "/p/"), "/")
	p, ok := loadPoster(id)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if !ok {
		w.WriteHeader(http.StatusNotFound)
		phoneTmpl.Execute(w, map[string]any{"Missing": true})
		return
	}
	f := factor(p.Cols * p.Rows)
	fs := make([]string, len(f))
	for i, v := range f {
		fs[i] = fmt.Sprint(v)
	}
	ones := strings.Count(p.Bits, "1")
	phoneTmpl.Execute(w, map[string]any{
		"ID": p.ID, "Name": p.Name, "Bits": len(p.Bits), "Fact": strings.Join(fs, " × "),
		"Ones": ones, "Zeros": len(p.Bits) - ones, "Secs": fmt.Sprintf("%.1f", float64(len(p.Bits))/float64(p.Bps)),
		"Preview": previewRows(p),
	})
}

func previewRows(p *poster) []string {
	rows := []string{}
	for y := 0; y < p.Rows && y < 6; y++ {
		rows = append(rows, p.Bits[y*p.Cols:(y+1)*p.Cols])
	}
	return rows
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err != nil {
		fmt.Println("  Open this in your browser: " + url)
	}
}

const phoneHTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{if .Missing}}Pixel Beacon{{else}}{{.Name}} · Pixel Beacon{{end}}</title>
<link rel="icon" href="data:,">
<style>
@font-face{font-family:"Silkscreen";font-weight:400;src:url(/fonts/silkscreen-latin-400-normal.woff2) format("woff2")}
@font-face{font-family:"Atkinson Hyperlegible";font-weight:400;src:url(/fonts/atkinson-hyperlegible-latin-400-normal.woff2) format("woff2")}
@font-face{font-family:"Atkinson Hyperlegible";font-weight:700;src:url(/fonts/atkinson-hyperlegible-latin-700-normal.woff2) format("woff2")}
@font-face{font-family:"IBM Plex Mono";font-weight:600;src:url(/fonts/ibm-plex-mono-latin-600-normal.woff2) format("woff2")}
:root{color-scheme:light;--bg:#eef0f8;--panel:#fff;--line:#d4d8ea;--ink:#171a33;--dim:#5d6285;--amber:#e9a21f;--amber-ink:#1b1405;--screen:#0b0e1f;--dot:#c7cce3;
 --f-display:"Silkscreen","Courier New",monospace;--f-body:"Atkinson Hyperlegible",system-ui,-apple-system,"Segoe UI",sans-serif;--f-mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace}
*{box-sizing:border-box}
body{margin:0;background:var(--bg) radial-gradient(var(--dot) 1px,transparent 1.5px) 0 0/22px 22px;color:var(--ink);font-family:var(--f-body);font-size:16px;line-height:1.45;
 padding:16px max(16px,env(safe-area-inset-left)) 32px max(16px,env(safe-area-inset-right))}
main{max-width:480px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
h1{font-family:var(--f-display);font-size:22px;margin:0;letter-spacing:.02em}h1 b{color:var(--amber);font-weight:400}
.poster{background:var(--screen);border-radius:10px;padding:6px;text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center;box-shadow:0 10px 26px #171a3322}
.poster h2{font-family:var(--f-display);font-weight:400;color:#fff;font-size:28px;margin:0;overflow-wrap:anywhere}
.poster img{display:block;max-width:100%;height:auto;image-rendering:pixelated;-webkit-touch-callout:default}
.fact{font-family:var(--f-mono);font-weight:600;color:#f2b544;font-size:15px;margin:0}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:10px}
.card h3{margin:0;font-size:17px}
.btn{display:block;text-align:center;text-decoration:none;font-weight:700;font-size:17px;padding:14px;border-radius:9px;background:var(--amber);color:var(--amber-ink)}
.btn:active{filter:brightness(.95)}
audio{width:100%}
.tip{margin:0;color:var(--dim);font-size:14px}
.bits{font-family:var(--f-mono);font-size:11px;color:var(--dim);white-space:pre;overflow:hidden;margin:0}
</style></head><body><main>
<h1>Pixel <b>Beacon</b></h1>
{{if .Missing}}
<div class="card"><h3>This poster isn’t here</h3><p class="tip">Ask the booth to show your code again.</p></div>
{{else}}
<div class="poster">
  <img src="/f/{{.ID}}.png" alt="{{.Name}}’s pixel art poster">
</div>
<div class="card">
  <h3>Your picture</h3>
  <a class="btn" href="/f/{{.ID}}.png?dl=1" download>⬇ Download picture</a>
  <p class="tip">On iPhone you can also press and hold the poster above and choose <b>Add to Photos</b>.</p>
</div>
<div class="card">
  <h3>Your alien signal</h3>
  <audio controls preload="metadata" src="/f/{{.ID}}.wav"></audio>
  <a class="btn" href="/f/{{.ID}}.wav?dl=1" download>⬇ Download sound</a>
  <p class="tip">{{.Secs}} seconds of radio beeps: a high tone for every 1, a low tone for every 0. Your drawing has {{.Ones}} ones and {{.Zeros}} zeros.</p>
</div>
<div class="card">
  <h3>How an alien reads it</h3>
  <p class="tip">{{.Bits}} is only {{.Fact}}, so a clever listener stacks the beeps into rows of the right width and your picture appears. That’s how the 1974 Arecibo message worked (1,679 = 23 × 73).</p>
  <p class="bits">{{range .Preview}}{{.}}
{{end}}…</p>
</div>
{{end}}
</main></body></html>`
