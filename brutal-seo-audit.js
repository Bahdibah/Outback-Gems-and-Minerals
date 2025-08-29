/**
 * BRUTAL HONEST SEO AUDIT - Outback Gems & Minerals
 * This audit will be ruthlessly honest about every SEO issue
 */

const fs = require('fs');
const path = require('path');

class BrutalSEOAuditor {
    constructor() {
        this.issues = [];
        this.warnings = [];
        this.successes = [];
        this.criticalFailures = [];
        
        this.htmlFiles = [
            'index.html',
            'products.html', 
            'view-product.html',
            'contact.html',
            'cancel.html',
            'cart.html',
            'thankyou.html',
            'termsofuse.html',
            'privacypolicy.html',
            'sitemap.html'
        ];
    }

    addIssue(severity, category, issue, impact) {
        const item = { severity, category, issue, impact };
        if (severity === 'CRITICAL') {
            this.criticalFailures.push(item);
        } else if (severity === 'WARNING') {
            this.warnings.push(item);
        } else {
            this.issues.push(item);
        }
    }

    addSuccess(category, achievement) {
        this.successes.push({ category, achievement });
    }

    // Check title tag implementation across all pages
    auditTitleTags() {
        console.log('\n🔍 AUDITING TITLE TAGS...');
        
        this.htmlFiles.forEach(file => {
            try {
                if (!fs.existsSync(file)) return;
                
                const content = fs.readFileSync(file, 'utf8');
                const titleMatch = content.match(/<title>([^<]+)<\/title>/);
                const ogTitleMatch = content.match(/property="og:title"\s+content="([^"]+)"/);
                
                if (!titleMatch) {
                    this.addIssue('CRITICAL', 'Title Tags', `${file} has NO title tag`, 'Search engines cannot understand page purpose');
                } else if (!ogTitleMatch) {
                    this.addIssue('WARNING', 'Title Tags', `${file} missing og:title`, 'Social sharing will be poor');
                } else if (titleMatch[1] !== ogTitleMatch[1]) {
                    this.addIssue('CRITICAL', 'Title Tags', `${file} title mismatch: "${titleMatch[1]}" vs "${ogTitleMatch[1]}"`, 'Confuses search engines and social platforms');
                } else {
                    this.addSuccess('Title Tags', `${file} has perfect title consistency`);
                }
                
                // Check title length
                if (titleMatch && titleMatch[1].length > 60) {
                    this.addIssue('WARNING', 'Title Tags', `${file} title too long (${titleMatch[1].length} chars)`, 'Will be truncated in search results');
                }
                
            } catch (error) {
                this.addIssue('CRITICAL', 'Title Tags', `Cannot read ${file}`, 'Page may be broken');
            }
        });
    }

    // Check H1 implementation
    auditH1Tags() {
        console.log('\n🔍 AUDITING H1 TAGS...');
        
        this.htmlFiles.forEach(file => {
            try {
                if (!fs.existsSync(file)) return;
                
                const content = fs.readFileSync(file, 'utf8');
                const h1Matches = content.match(/<h1[^>]*>/g) || [];
                
                if (h1Matches.length === 0) {
                    this.addIssue('CRITICAL', 'H1 Tags', `${file} has NO H1 tag`, 'Missing primary heading hurts SEO significantly');
                } else if (h1Matches.length > 1) {
                    this.addIssue('CRITICAL', 'H1 Tags', `${file} has ${h1Matches.length} H1 tags`, 'Multiple H1s confuse search engines');
                } else {
                    // Check if H1 has meaningful content
                    const h1Content = content.match(/<h1[^>]*>([^<]+)<\/h1>/);
                    if (h1Content && h1Content[1].trim().length > 0) {
                        this.addSuccess('H1 Tags', `${file} has proper single H1`);
                    } else {
                        this.addIssue('WARNING', 'H1 Tags', `${file} H1 may be empty or dynamic only`, 'H1 content needs verification');
                    }
                }
                
            } catch (error) {
                this.addIssue('CRITICAL', 'H1 Tags', `Cannot analyze H1 in ${file}`, 'Technical error');
            }
        });
    }

    // Check meta description implementation
    auditMetaDescriptions() {
        console.log('\n🔍 AUDITING META DESCRIPTIONS...');
        
        this.htmlFiles.forEach(file => {
            try {
                if (!fs.existsSync(file)) return;
                
                const content = fs.readFileSync(file, 'utf8');
                const descMatch = content.match(/name="description"\s+content="([^"]+)"/);
                
                if (!descMatch) {
                    this.addIssue('CRITICAL', 'Meta Descriptions', `${file} has NO meta description`, 'Search engines will create poor snippets');
                } else {
                    const length = descMatch[1].length;
                    if (length < 120) {
                        this.addIssue('WARNING', 'Meta Descriptions', `${file} description too short (${length} chars)`, 'Missing opportunity for better search snippets');
                    } else if (length > 160) {
                        this.addIssue('WARNING', 'Meta Descriptions', `${file} description too long (${length} chars)`, 'Will be truncated in search results');
                    } else {
                        this.addSuccess('Meta Descriptions', `${file} has optimal description length`);
                    }
                }
                
            } catch (error) {
                this.addIssue('CRITICAL', 'Meta Descriptions', `Cannot analyze ${file}`, 'Technical error');
            }
        });
    }

    // Check URL and canonical implementation
    auditURLStructure() {
        console.log('\n🔍 AUDITING URL STRUCTURE...');
        
        this.htmlFiles.forEach(file => {
            try {
                if (!fs.existsSync(file)) return;
                
                const content = fs.readFileSync(file, 'utf8');
                
                // Check for canonical tag
                const canonicalMatch = content.match(/rel="canonical"\s+href="([^"]+)"/);
                if (!canonicalMatch) {
                    this.addIssue('WARNING', 'URL Structure', `${file} missing canonical URL`, 'Duplicate content issues possible');
                } else {
                    // Check for www consistency
                    if (canonicalMatch[1].includes('://www.')) {
                        this.addIssue('CRITICAL', 'URL Structure', `${file} uses www in canonical (${canonicalMatch[1]})`, 'URL structure inconsistency');
                    } else {
                        this.addSuccess('URL Structure', `${file} has proper non-www canonical`);
                    }
                }
                
                // Check og:url consistency
                const ogUrlMatch = content.match(/property="og:url"\s+content="([^"]+)"/);
                if (ogUrlMatch && canonicalMatch && ogUrlMatch[1] !== canonicalMatch[1]) {
                    this.addIssue('CRITICAL', 'URL Structure', `${file} canonical/og:url mismatch`, 'URL signals are contradictory');
                }
                
            } catch (error) {
                this.addIssue('CRITICAL', 'URL Structure', `Cannot analyze ${file}`, 'Technical error');
            }
        });
    }

    // Check image optimization
    auditImageSEO() {
        console.log('\n🔍 AUDITING IMAGE SEO...');
        
        this.htmlFiles.forEach(file => {
            try {
                if (!fs.existsSync(file)) return;
                
                const content = fs.readFileSync(file, 'utf8');
                const imgTags = content.match(/<img[^>]*>/g) || [];
                
                let missingAlt = 0;
                let genericAlt = 0;
                let goodAlt = 0;
                
                imgTags.forEach(img => {
                    if (!img.includes('alt=')) {
                        missingAlt++;
                    } else {
                        const altMatch = img.match(/alt="([^"]+)"/);
                        if (altMatch) {
                            const altText = altMatch[1].toLowerCase();
                            if (altText.includes('image') || altText.includes('photo') || altText.includes('picture') || altText === '') {
                                genericAlt++;
                            } else {
                                goodAlt++;
                            }
                        }
                    }
                });
                
                if (missingAlt > 0) {
                    this.addIssue('CRITICAL', 'Image SEO', `${file} has ${missingAlt} images without alt tags`, 'Accessibility and SEO failure');
                }
                
                if (genericAlt > 0) {
                    this.addIssue('WARNING', 'Image SEO', `${file} has ${genericAlt} generic alt tags`, 'Missing keyword opportunities');
                }
                
                if (goodAlt > 0) {
                    this.addSuccess('Image SEO', `${file} has ${goodAlt} properly optimized images`);
                }
                
            } catch (error) {
                this.addIssue('CRITICAL', 'Image SEO', `Cannot analyze images in ${file}`, 'Technical error');
            }
        });
    }

    // Check Schema.org implementation
    auditStructuredData() {
        console.log('\n🔍 AUDITING STRUCTURED DATA...');
        
        this.htmlFiles.forEach(file => {
            try {
                if (!fs.existsSync(file)) return;
                
                const content = fs.readFileSync(file, 'utf8');
                
                // Count JSON-LD scripts
                const jsonLdMatches = content.match(/type="application\/ld\+json"/g) || [];
                
                // Check for old microdata
                const microdataMatches = content.match(/itemscope|itemtype|itemprop/g) || [];
                
                if (jsonLdMatches.length === 0) {
                    this.addIssue('WARNING', 'Structured Data', `${file} has no structured data`, 'Missing rich snippet opportunities');
                } else {
                    this.addSuccess('Structured Data', `${file} has ${jsonLdMatches.length} JSON-LD implementations`);
                }
                
                if (microdataMatches.length > 0) {
                    this.addIssue('WARNING', 'Structured Data', `${file} has ${microdataMatches.length} old microdata attributes`, 'Should use JSON-LD only');
                }
                
            } catch (error) {
                this.addIssue('CRITICAL', 'Structured Data', `Cannot analyze ${file}`, 'Technical error');
            }
        });
    }

    // Check page speed and performance indicators
    auditPageSpeed() {
        console.log('\n🔍 AUDITING PAGE SPEED INDICATORS...');
        
        this.htmlFiles.forEach(file => {
            try {
                if (!fs.existsSync(file)) return;
                
                const content = fs.readFileSync(file, 'utf8');
                const fileSize = Buffer.byteLength(content, 'utf8');
                
                // Check for performance optimizations
                const hasPreload = content.includes('rel="preload"');
                const hasPrefetch = content.includes('rel="dns-prefetch"');
                const hasPreconnect = content.includes('rel="preconnect"');
                
                if (fileSize > 100000) { // 100KB
                    this.addIssue('WARNING', 'Page Speed', `${file} is large (${Math.round(fileSize/1024)}KB)`, 'Slow loading affects SEO ranking');
                }
                
                if (!hasPrefetch && !hasPreconnect) {
                    this.addIssue('WARNING', 'Page Speed', `${file} missing resource hints`, 'Could load faster with DNS prefetch/preconnect');
                } else {
                    this.addSuccess('Page Speed', `${file} has performance optimizations`);
                }
                
            } catch (error) {
                this.addIssue('CRITICAL', 'Page Speed', `Cannot analyze ${file}`, 'Technical error');
            }
        });
    }

    // Check mobile responsiveness indicators
    auditMobileOptimization() {
        console.log('\n🔍 AUDITING MOBILE OPTIMIZATION...');
        
        this.htmlFiles.forEach(file => {
            try {
                if (!fs.existsSync(file)) return;
                
                const content = fs.readFileSync(file, 'utf8');
                
                // Check viewport meta tag
                const viewportMatch = content.match(/name="viewport"\s+content="([^"]+)"/);
                if (!viewportMatch) {
                    this.addIssue('CRITICAL', 'Mobile SEO', `${file} missing viewport meta tag`, 'Mobile usability failure - Google penalty');
                } else if (!viewportMatch[1].includes('width=device-width')) {
                    this.addIssue('CRITICAL', 'Mobile SEO', `${file} improper viewport: "${viewportMatch[1]}"`, 'Mobile display issues');
                } else {
                    this.addSuccess('Mobile SEO', `${file} has proper viewport configuration`);
                }
                
            } catch (error) {
                this.addIssue('CRITICAL', 'Mobile SEO', `Cannot analyze ${file}`, 'Technical error');
            }
        });
    }

    // Check internal linking structure
    auditInternalLinking() {
        console.log('\n🔍 AUDITING INTERNAL LINKING...');
        
        this.htmlFiles.forEach(file => {
            try {
                if (!fs.existsSync(file)) return;
                
                const content = fs.readFileSync(file, 'utf8');
                const internalLinks = content.match(/href="[^"]*\.html"/g) || [];
                
                if (internalLinks.length < 3 && file !== 'thankyou.html' && file !== 'cancel.html') {
                    this.addIssue('WARNING', 'Internal Linking', `${file} has only ${internalLinks.length} internal links`, 'Poor site architecture for SEO');
                }
                
                // Check for external links without proper attributes
                const externalLinks = content.match(/href="https?:\/\/[^"]*"/g) || [];
                externalLinks.forEach(link => {
                    if (!content.includes(`${link}" target="_blank"`) && !content.includes(`${link}" rel="noopener"`)) {
                        this.addIssue('WARNING', 'Internal Linking', `${file} external link without proper attributes`, 'Link equity leak and security risk');
                    }
                });
                
            } catch (error) {
                this.addIssue('CRITICAL', 'Internal Linking', `Cannot analyze ${file}`, 'Technical error');
            }
        });
    }

    // Check loading performance
    auditLoadingPerformance() {
        console.log('\n🔍 AUDITING LOADING PERFORMANCE...');
        
        try {
            // Check JavaScript file sizes
            const jsFiles = ['products.js', 'view-product.js', 'index.js', 'cart.js'];
            jsFiles.forEach(jsFile => {
                if (fs.existsSync(jsFile)) {
                    const size = fs.statSync(jsFile).size;
                    if (size > 50000) { // 50KB
                        this.addIssue('WARNING', 'Loading Performance', `${jsFile} is large (${Math.round(size/1024)}KB)`, 'Slow JavaScript execution affects Core Web Vitals');
                    }
                }
            });
            
            // Check JSON data files
            if (fs.existsSync('inventory.json')) {
                const inventorySize = fs.statSync('inventory.json').size;
                if (inventorySize > 100000) { // 100KB
                    this.addIssue('WARNING', 'Loading Performance', `inventory.json is large (${Math.round(inventorySize/1024)}KB)`, 'Large data files slow page loading');
                } else {
                    this.addSuccess('Loading Performance', 'Inventory data size is acceptable');
                }
            }
            
        } catch (error) {
            this.addIssue('CRITICAL', 'Loading Performance', 'Cannot analyze file sizes', 'Technical error');
        }
    }

    // Check content quality and keyword optimization
    auditContentQuality() {
        console.log('\n🔍 AUDITING CONTENT QUALITY...');
        
        try {
            // Check key pages for content depth
            const keyPages = {
                'index.html': 'Homepage',
                'products.html': 'Products Page', 
                'contact.html': 'Contact Page'
            };
            
            Object.entries(keyPages).forEach(([file, pageName]) => {
                if (fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf8');
                    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
                    const wordCount = textContent.split(' ').filter(word => word.length > 2).length;
                    
                    if (wordCount < 200) {
                        this.addIssue('WARNING', 'Content Quality', `${pageName} has thin content (${wordCount} words)`, 'Search engines prefer substantial content');
                    } else {
                        this.addSuccess('Content Quality', `${pageName} has sufficient content depth`);
                    }
                }
            });
            
        } catch (error) {
            this.addIssue('CRITICAL', 'Content Quality', 'Cannot analyze content', 'Technical error');
        }
    }

    // Check favicon implementation
    auditFavicons() {
        console.log('\n🔍 AUDITING FAVICON IMPLEMENTATION...');
        
        this.htmlFiles.forEach(file => {
            try {
                if (!fs.existsSync(file)) return;
                
                const content = fs.readFileSync(file, 'utf8');
                const faviconMatches = content.match(/rel="icon"[^>]*>/g) || [];
                
                if (faviconMatches.length === 0) {
                    this.addIssue('WARNING', 'Favicon', `${file} has no favicon`, 'Missing branding in browser tabs');
                } else if (faviconMatches.length > 1) {
                    this.addIssue('WARNING', 'Favicon', `${file} has ${faviconMatches.length} favicon declarations`, 'Redundant resource loading');
                } else {
                    this.addSuccess('Favicon', `${file} has clean favicon implementation`);
                }
                
            } catch (error) {
                this.addIssue('CRITICAL', 'Favicon', `Cannot analyze ${file}`, 'Technical error');
            }
        });
    }

    // Check robots.txt and sitemap
    auditCrawlability() {
        console.log('\n🔍 AUDITING CRAWLABILITY...');
        
        // Check robots.txt
        if (fs.existsSync('robots.txt')) {
            const robotsContent = fs.readFileSync('robots.txt', 'utf8');
            if (robotsContent.includes('Disallow: /')) {
                this.addIssue('CRITICAL', 'Crawlability', 'robots.txt blocks all pages', 'Site cannot be indexed');
            } else {
                this.addSuccess('Crawlability', 'robots.txt allows proper crawling');
            }
        } else {
            this.addIssue('WARNING', 'Crawlability', 'No robots.txt file', 'Missing crawl directives');
        }
        
        // Check sitemap
        if (fs.existsSync('sitemap.xml')) {
            this.addSuccess('Crawlability', 'XML sitemap exists');
        } else {
            this.addIssue('WARNING', 'Crawlability', 'No XML sitemap', 'Search engines may miss pages');
        }
    }

    // Run complete audit
    async runCompleteAudit() {
        console.log('💀 BRUTAL HONEST SEO AUDIT - NO MERCY MODE 💀');
        console.log('================================================\n');
        console.log('Analyzing every aspect of SEO implementation...');
        
        this.auditTitleTags();
        this.auditH1Tags();
        this.auditMetaDescriptions();
        this.auditURLStructure();
        this.auditImageSEO();
        this.auditLoadingPerformance();
        this.auditContentQuality();
        this.auditFavicons();
        this.auditCrawlability();
        
        this.generateBrutalReport();
    }

    generateBrutalReport() {
        console.log('\n💀 BRUTAL HONEST RESULTS 💀');
        console.log('============================\n');
        
        // Critical failures first
        if (this.criticalFailures.length > 0) {
            console.log('🚨 CRITICAL FAILURES (WILL HURT RANKINGS):');
            this.criticalFailures.forEach((item, index) => {
                console.log(`${index + 1}. [${item.category}] ${item.issue}`);
                console.log(`   💥 Impact: ${item.impact}\n`);
            });
        }
        
        // Warnings
        if (this.warnings.length > 0) {
            console.log('⚠️  WARNINGS (MISSED OPPORTUNITIES):');
            this.warnings.forEach((item, index) => {
                console.log(`${index + 1}. [${item.category}] ${item.issue}`);
                console.log(`   ⚡ Impact: ${item.impact}\n`);
            });
        }
        
        // Successes
        if (this.successes.length > 0) {
            console.log('✅ WHAT\'S WORKING WELL:');
            this.successes.forEach((item, index) => {
                console.log(`${index + 1}. [${item.category}] ${item.achievement}`);
            });
            console.log('');
        }
        
        // Final brutal assessment
        const totalIssues = this.criticalFailures.length + this.warnings.length;
        const totalSuccesses = this.successes.length;
        const score = Math.max(0, Math.round(((totalSuccesses - this.criticalFailures.length * 2) / (totalSuccesses + totalIssues)) * 10));
        
        console.log('\n💀 BRUTAL FINAL VERDICT 💀');
        console.log('===========================');
        console.log(`SEO Score: ${score}/10`);
        
        if (score >= 9) {
            console.log('🏆 EXCEPTIONAL - This site will rank well');
        } else if (score >= 7) {
            console.log('🥈 GOOD - Solid foundation with room for improvement');
        } else if (score >= 5) {
            console.log('🥉 AVERAGE - Needs significant optimization');
        } else {
            console.log('💀 POOR - Critical SEO issues need immediate attention');
        }
        
        console.log(`\nCritical Issues: ${this.criticalFailures.length}`);
        console.log(`Warnings: ${this.warnings.length}`);
        console.log(`Successes: ${this.successes.length}`);
        
        if (this.criticalFailures.length > 0) {
            console.log('\n🚨 IMMEDIATE ACTION REQUIRED:');
            console.log('Fix critical failures first - they directly hurt rankings!');
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️  OPTIMIZATION OPPORTUNITIES:');
            console.log('Address warnings to maximize SEO potential');
        }
    }
}

// Run the brutal audit
const auditor = new BrutalSEOAuditor();
auditor.runCompleteAudit();
